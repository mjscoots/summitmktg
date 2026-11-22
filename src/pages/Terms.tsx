import LegalDoc, { LEGAL_CONTACT, LEGAL_ENTITY, type LegalSection } from '@/components/legal/LegalDoc';

const sections: LegalSection[] = [
  {
    heading: 'Agreement',
    paragraphs: [
      `These terms apply to this website, which is run by ${LEGAL_ENTITY} ("Trinity", "we", "us"). By using the site you agree to them. If you do not agree, please do not use the site.`,
    ],
  },
  {
    heading: 'Applications are not offers',
    paragraphs: [
      'Submitting an application, booking a call or using a Trinity ticket does not create a job offer, a contract or any working relationship. Any role with Trinity is governed only by a separate written agreement signed by both sides.',
    ],
  },
  {
    heading: 'No earnings promise',
    paragraphs: [
      'Sales work with Trinity is commission-based. Earnings depend on what each person sells and keeps serviced. Nothing on this site is a promise or guarantee of income.',
    ],
  },
  {
    heading: 'Accurate information',
    paragraphs: [
      'Please give true and complete information when you apply or contact us.',
    ],
  },
  {
    heading: 'Team portal accounts',
    bullets: [
      'The portal is only for people Trinity has given access to.',
      'Keep your password private. You are responsible for activity on your account.',
      'Training materials, scripts and other portal content are for Trinity team use only. Do not copy, share or publish them without permission.',
      'We may suspend or end portal access at any time.',
    ],
  },
  {
    heading: 'Acceptable use',
    bullets: [
      'Do not misuse the site, try to get into accounts or areas you are not allowed to use, or interfere with how it works.',
      'Do not submit spam, false applications or someone else’s information.',
      'Do not use the site for anything unlawful.',
    ],
  },
  {
    heading: 'Our content',
    paragraphs: [
      'The Trinity name, logos, text, images and videos on this site belong to Trinity or its licensors. You may view them for personal use only.',
    ],
  },
  {
    heading: 'Other websites',
    paragraphs: [
      'Links to services such as Calendly, Instagram, YouTube and Google Drive are provided for convenience. We are not responsible for those services or their content.',
    ],
  },
  {
    heading: 'Disclaimer',
    paragraphs: [
      'The site is provided "as is" and "as available." We do not promise it will always be available, error-free or up to date.',
    ],
  },
  {
    heading: 'Limitation of liability',
    paragraphs: [
      'To the fullest extent the law allows, Trinity is not liable for indirect, incidental or consequential damages arising from your use of the site.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      'We may update these terms. The date at the top shows when they last changed. Continuing to use the site after a change means you accept the updated terms.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [`Questions about these terms: ${LEGAL_CONTACT}.`],
  },
];

export default function Terms() {
  return (
    <LegalDoc
      title="Terms of Use"
      path="/terms"
      description="Terms for using the Trinity Marketing LLC website and team portal."
      updated="Draft dated November 21, 2026"
      intro="Plain-language summary: applying is not a job offer, pay is commission with no earnings promise, and the team portal is for authorized team members only."
      sections={sections}
    />
  );
}
