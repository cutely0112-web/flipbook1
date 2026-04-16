// assets/sound.ts

// (옵션) 실패 시 사용할 베이스64 예비 데이터 – 있으면 그대로 두고 써도 됨
const FLIP_SOUND_BASE64 =
  "data:audio/wav;base64,UklGRi5WAABXQVZ...1234567890abcdef";

// GitHub Pages에서도 잘 동작하도록 BASE_URL 사용
const FLIP_SOUND_URL = `${import.meta.env.BASE_URL}assets/flip.wav`;

export const createFlipSound = (): HTMLAudioElement => {
  // public/assets/flip.wav 를 바라보도록 설정
  const audio = new Audio(FLIP_SOUND_URL);

  // 기본 볼륨
  audio.volume = 1.0;

  // 로딩 실패 시 베이스64로 폴백
  const onAudioError = () => {
    audio.removeEventListener('error', onAudioError);
    if (FLIP_SOUND_BASE64) {
      audio.src = FLIP_SOUND_BASE64;
    }
  };

  audio.addEventListener('error', onAudioError);

  return audio;
};
