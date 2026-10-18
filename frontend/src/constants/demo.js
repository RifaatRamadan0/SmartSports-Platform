import { Shirt, LandPlot, ShieldCheck } from 'lucide-react'

// Demo accounts shown on the login page of the live demo.
// These must exist in the deployed database with matching roles
// and is_email_verified = true (DEPLOYMENT-PLAN.md, Phase 3.3).
// Login uses the email because no endpoint can change it; username is display only.
export const DEMO_PASSWORD = 'Demo1234!'

export const DEMO_ACCOUNTS = [
  { label: 'Player', username: 'demo_player', email: 'demo_player@example.com', icon: Shirt },
  { label: 'Owner',  username: 'demo_owner',  email: 'demo_owner@example.com',  icon: LandPlot },
  { label: 'Admin',  username: 'demo_admin',  email: 'demo_admin@example.com',  icon: ShieldCheck },
]

export const DEMO_LIMIT_NOTE =
  'SMS and email run on Twilio/Resend trial tiers, so sign-up and password reset ' +
  "only work for the owner's phone and email. Use a demo account."
