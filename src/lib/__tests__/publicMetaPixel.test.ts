import { expect, test } from 'bun:test';
import { isPublicRecruitingPath, validMetaPixelId, regionPermitsMeta, trackPublicMeta } from '../publicMetaPixel';

test('missing or placeholder pixel IDs cannot activate Meta', async () => {
  expect(validMetaPixelId(undefined)).toBe(false);
  expect(validMetaPixelId('')).toBe(false);
  expect(validMetaPixelId('REPLACE_ME')).toBe(false);
  // Resolves even without browser globals: missing configuration exits first.
  await trackPublicMeta('Lead');
});

test('signed-in app and admin pages are never eligible', () => {
  expect(isPublicRecruitingPath('/app')).toBe(false);
  expect(isPublicRecruitingPath('/app/recruiting')).toBe(false);
  expect(isPublicRecruitingPath('/admin/content')).toBe(false);
  expect(isPublicRecruitingPath('/application-private')).toBe(false);
  expect(isPublicRecruitingPath('/apply/rookie')).toBe(true);
  expect(isPublicRecruitingPath('/industries/pest')).toBe(true);
  expect(isPublicRecruitingPath('/')).toBe(true);
});

test('consent and unresolved regions remain blocked without a banner', () => {
  expect(regionPermitsMeta('GB')).toBe(false);
  expect(regionPermitsMeta('DE')).toBe(false);
  expect(regionPermitsMeta('XX')).toBe(false);
  expect(regionPermitsMeta('T1')).toBe(false);
  expect(regionPermitsMeta('')).toBe(false);
  expect(regionPermitsMeta('US')).toBe(true);
});