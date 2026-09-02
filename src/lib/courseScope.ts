/**
 * Pass 159 - a course carries the industry it belongs to. Opening it from
 * another workspace shows the out of workspace notice instead of the lessons.
 *
 * One exception: learn-your-pitch is the bridge every industry uses to learn a
 * pitch, so it stays readable from Fiber.
 */
export const BRIDGE_COURSE_SLUGS = ['learn-your-pitch'];

export function courseInWorkspace(
  courseVertical: string | null | undefined,
  activeVertical: string | null | undefined,
  slug: string | null | undefined
): boolean {
  if (!courseVertical) return true;
  if (slug && BRIDGE_COURSE_SLUGS.includes(slug)) return true;
  return courseVertical === (activeVertical || 'Pest');
}
