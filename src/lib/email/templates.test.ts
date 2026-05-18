import { describe, expect, it } from 'vitest'
import {
  devTestEmail,
  invitationEmail,
  quoteSentEmail,
  missionReminderEmail,
  missionLateAlertEmail,
} from './templates'

describe('email templates', () => {
  describe('invitationEmail', () => {
    const tpl = invitationEmail({
      inviterName: 'Marie Dupont',
      companyName: 'Nettoyage Pro',
      roleLabel: 'Administrateur',
      acceptUrl: 'https://app.proprely.fr/accept-invitation/abc?token=xyz',
    })

    it('mentions inviter, company and role in subject', () => {
      expect(tpl.subject).toContain('Marie Dupont')
      expect(tpl.subject).toContain('Nettoyage Pro')
    })

    it('embeds the accept URL in both html and text', () => {
      expect(tpl.html).toContain('https://app.proprely.fr/accept-invitation/abc?token=xyz')
      expect(tpl.text).toContain('https://app.proprely.fr/accept-invitation/abc?token=xyz')
    })

    it('mentions the role label', () => {
      expect(tpl.html).toContain('Administrateur')
    })

    it('produces full HTML shell', () => {
      expect(tpl.html).toMatch(/<!doctype html>/i)
      expect(tpl.html).toContain('Proprely')
    })
  })

  describe('quoteSentEmail', () => {
    it('includes quote number and client name', () => {
      const tpl = quoteSentEmail({
        recipientName: 'Alex',
        clientName: 'Acme SARL',
        quoteNumber: 'DEV-2026-001',
      })
      expect(tpl.subject).toContain('DEV-2026-001')
      expect(tpl.subject).toContain('Acme SARL')
      expect(tpl.html).toContain('Alex')
      expect(tpl.text).toContain('DEV-2026-001')
    })

    it('omits sign link when not provided', () => {
      const tpl = quoteSentEmail({
        recipientName: 'Alex',
        clientName: 'Acme',
        quoteNumber: 'X',
      })
      // No naked "Lien client" anchor block when signUrl is undefined.
      expect(tpl.html).not.toContain('Lien de signature côté client')
    })

    it('embeds sign link when provided', () => {
      const tpl = quoteSentEmail({
        recipientName: 'Alex',
        clientName: 'Acme',
        quoteNumber: 'X',
        signUrl: 'https://docuseal.com/s/abc',
      })
      expect(tpl.html).toContain('https://docuseal.com/s/abc')
    })
  })

  describe('devTestEmail', () => {
    it('echoes the recipient address back into the body', () => {
      const tpl = devTestEmail({ to: 'clement@pershingsolution.com' })
      expect(tpl.html).toContain('clement@pershingsolution.com')
      expect(tpl.text).toContain('clement@pershingsolution.com')
    })
  })

  describe('missionReminderEmail', () => {
    const tpl = missionReminderEmail({
      agentFirstName: 'Marie',
      clientName: 'Bureaux Lyon',
      siteName: 'Tour A',
      scheduledDate: '2026-05-20',
      startTime: '08:30',
      plannedHours: 4,
      appUrl: 'https://app.proprely.fr',
    })

    it('mentions agent name in subject and body', () => {
      expect(tpl.subject).toMatch(/rappel/i)
      expect(tpl.html).toContain('Marie')
    })

    it('embeds the agent agenda link', () => {
      expect(tpl.html).toContain('https://app.proprely.fr/agent/mon-agenda')
      expect(tpl.text).toContain('https://app.proprely.fr/agent/mon-agenda')
    })

    it('mentions client + site + start time', () => {
      expect(tpl.html).toContain('Bureaux Lyon')
      expect(tpl.html).toContain('Tour A')
      expect(tpl.html).toContain('08:30')
    })
  })

  describe('missionLateAlertEmail', () => {
    const tpl = missionLateAlertEmail({
      managerFirstName: 'Paul',
      clientName: 'Hôpital Sud',
      siteName: null,
      scheduledDate: '2026-05-18',
      startTime: '09:00',
      agentNames: ['Marie Dupont', 'Léo Bernard'],
      delayMinutes: 22,
      appUrl: 'https://app.proprely.fr',
    })

    it('uses "en retard" in subject', () => {
      expect(tpl.subject).toMatch(/retard/i)
      expect(tpl.subject).toContain('Hôpital Sud')
    })

    it('lists assigned agents and delay', () => {
      expect(tpl.html).toContain('Marie Dupont')
      expect(tpl.html).toContain('Léo Bernard')
      expect(tpl.html).toContain('22')
    })

    it('links to the cockpit', () => {
      expect(tpl.html).toContain('https://app.proprely.fr/operations/cockpit')
    })

    it('handles missing site name gracefully', () => {
      expect(tpl.html).not.toContain('null')
      expect(tpl.html).not.toContain('undefined')
    })
  })
})
