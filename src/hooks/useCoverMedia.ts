import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CoverMedia {
  video: string;
  image: string;
}

/**
 * Optional cover media. Both keys are owner set (app_settings, read through the
 * allowlisted get_public_setting). When empty nothing renders, so the cover
 * never shows a placeholder box or stock art.
 */
export function useCoverMedia(): CoverMedia {
  const [media, setMedia] = useState<CoverMedia>({ video: '', image: '' });

  useEffect(() => {
    let active = true;
    (async () => {
      const [video, image] = await Promise.all([
        supabase.rpc('get_public_setting', { _key: 'cover_hero_video' }),
        supabase.rpc('get_public_setting', { _key: 'cover_hero_image' }),
      ]);
      if (!active) return;
      setMedia({
        video: typeof video.data === 'string' ? video.data : '',
        image: typeof image.data === 'string' ? image.data : '',
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  return media;
}
