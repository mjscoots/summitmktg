import LegalDoc, { LEGAL_CONTACT, LEGAL_ENTITY, type LegalSection } from '@/components/legal/LegalDoc';

const sections: LegalSection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      `This website is run by ${LEGAL_ENTITY} ("Trinity", "we", "us"). Trinity recruits, trains and fields door-to-door sales reps. This policy explains what information the site collects, how we use it, and the choices you have.`,
    ],
  },
  {
    heading: 'Information you give us',
    paragraphs: ['When you apply, request a call, or use a Trinity ticket, we collect what you type in:'],
    bullets: [
      'Application: your name, phone number, email address, the industries you are interested in, your prior experience, whether you prefer in-person or remote work, your earnings goal, your city and state, and who told you about Trinity.',
      'Veteran application, in addition: your last season revenue and the markets you have worked.',
      'Ticket form: your first name, phone number, city, and why you are interested.',
      'Team portal: the email address and password you sign in with, and the information you add or that is created while you use the portal (for example your profile, training progress and messages).',
    ],
  },
  {
    heading: 'Partial applications',
    paragraphs: [
      'We save your name and contact details as soon as you enter them, and we save your answers as you move through the application. This lets someone from Trinity reach you even if you stop before the end.',
    ],
  },
  {
    heading: 'Information collected automatically',
    bullets: [
      'Referral and source details from the link you used, such as a referral code, market or industry in the web address.',
      'Small pieces of data stored in your browser, such as an application key and your contact details, so a refresh does not make you start over, and the session that keeps you signed in to the portal.',
      'Standard technical information that any website receives, such as your IP address, browser type and the pages you visit, which our hosting and service providers may log.',
      'If Trinity turns on the Meta (Facebook) pixel, it records page views on the public recruiting pages and when an application is submitted or a scheduling button is clicked, to measure advertising. It does not run when your browser sends a Global Privacy Control or Do Not Track signal, or in regions where consent is required.',
    ],
  },
  {
    heading: 'How we use information',
    bullets: [
      'To review your application and contact you about it by phone call, text message or email.',
      'To schedule calls and interviews.',
      'To send you a confirmation email after you apply.',
      'To give team members access to the portal and its training.',
      'To understand where applicants come from and to improve the site.',
      'To keep the site secure, prevent spam, and meet legal obligations.',
    ],
  },
  {
    heading: 'Who we share it with',
    paragraphs: [
      'We do not sell your personal information. We share it only with people at Trinity who need it to recruit and manage the team, and with service providers that run the site for us, such as our hosting provider, our database and sign-in provider, and our email provider. Those providers may only use it to provide their service to us. We may also share information if the law requires it or to protect our rights and the safety of others.',
    ],
  },
  {
    heading: 'Third-party sites',
    paragraphs: [
      'Booking a call opens Calendly, and some links go to Instagram, YouTube or Google Drive. Those services have their own privacy policies, and what you enter there is governed by them, not by this policy.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'We keep application and contact information for as long as it is useful for recruiting, or until you ask us to delete it, unless we need to keep it longer for legal reasons.',
    ],
  },
  {
    heading: 'Your choices',
    paragraphs: [
      `You can ask us to show you, correct or delete the information we hold about you, or to stop contacting you, by emailing ${LEGAL_CONTACT}. You can clear the data stored in your browser at any time through your browser settings.`,
    ],
  },
  {
    heading: 'Security',
    paragraphs: [
      'We use reasonable measures to protect your information, but no website or storage system is completely secure.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'This site is not directed to children under 13, and we do not knowingly collect information from them.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      'We may update this policy. The date at the top shows when it last changed.',
    ],
  },
];

export default function Privacy() {
  return (
    <LegalDoc
      title="Privacy Policy"
      path="/privacy"
      description="How Trinity Marketing LLC collects and uses information on this site."
      updated="Draft dated November 21, 2026"
      intro="Plain-language summary: we collect what you type into the application and ticket forms, plus basic site data, and we use it to contact you about joining Trinity. We do not sell it."
      sections={sections}
    />
  );
}
