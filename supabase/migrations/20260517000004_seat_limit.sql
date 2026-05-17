-- Multi-tenant seat limit: each company = 1 owner + max 5 additional seats.
-- A "seat" is consumed by:
--   - any accepted profile that isn't the owner
--   - any pending invitation
--
-- Owners are created at signup only and never count toward the limit.
-- Expired/revoked invitations don't count (they freed their slot).
--
-- Enforced at two levels:
--   1. invitations INSERT: blocks the creation of a 6th pending invite.
--   2. profiles INSERT for non-owner: blocks any attempt to bypass the invitation flow.

CREATE OR REPLACE FUNCTION company_seats_used(target_company_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM profiles
       WHERE company_id = target_company_id
         AND role <> 'owner')
    +
    (SELECT COUNT(*) FROM invitations
       WHERE company_id = target_company_id
         AND status = 'pending')
$$;

CREATE OR REPLACE FUNCTION check_invitation_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only count toward the limit when a new pending invite is created.
  IF NEW.status = 'pending' THEN
    IF company_seats_used(NEW.company_id) >= 5 THEN
      RAISE EXCEPTION 'SEAT_LIMIT_REACHED: max 5 seats per company (owner excluded)'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invitations_seat_limit ON invitations;
CREATE TRIGGER trg_invitations_seat_limit
  BEFORE INSERT ON invitations
  FOR EACH ROW EXECUTE FUNCTION check_invitation_seat_limit();

CREATE OR REPLACE FUNCTION check_profile_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Owners are unlimited (1 per company, enforced separately by app logic at signup).
  IF NEW.role = 'owner' THEN
    RETURN NEW;
  END IF;
  -- For non-owners, count existing non-owner profiles only (the pending invite
  -- about to be consumed is already counted, then deleted/marked by the app).
  IF (SELECT COUNT(*) FROM profiles
        WHERE company_id = NEW.company_id
          AND role <> 'owner') >= 5 THEN
    RAISE EXCEPTION 'SEAT_LIMIT_REACHED: max 5 seats per company (owner excluded)'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_seat_limit ON profiles;
CREATE TRIGGER trg_profiles_seat_limit
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION check_profile_seat_limit();

-- Enforce 1 owner per company at DB level (prevents accidental dual-owner state).
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_one_owner_per_company
  ON profiles(company_id)
  WHERE role = 'owner';
