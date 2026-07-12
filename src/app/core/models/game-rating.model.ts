export type GameRating = 'LENDARIO' | 'MEMORAVEL' | 'MUITO_BOM' | 'BOM' | 'NORMAL' | 'NAO_GOSTEI_MUITO' | 'RUIM';

export const GAME_RATING_OPTIONS: { value: GameRating; label: string; hint: string }[] = [
  { value: 'LENDARIO', label: 'Lendário', hint: 'Um dos melhores jogos que já joguei — mudou algo em mim.' },
  { value: 'MEMORAVEL', label: 'Memorável', hint: 'Marcou muito, vou lembrar dele por anos.' },
  { value: 'MUITO_BOM', label: 'Muito bom', hint: 'Gostei bastante, recomendaria sem pensar duas vezes.' },
  { value: 'BOM', label: 'Bom', hint: 'Joguei e gostei, sem grandes ressalvas.' },
  { value: 'NORMAL', label: 'Normal', hint: 'Ok, mas não me marcou de verdade.' },
  { value: 'NAO_GOSTEI_MUITO', label: 'Não gostei muito', hint: 'Tenho ressalvas, não empolgou.' },
  { value: 'RUIM', label: 'Ruim', hint: 'Não gostei, não recomendaria.' },
];

export const GAME_RATING_LABEL: Record<GameRating, string> = {
  LENDARIO: 'Lendário',
  MEMORAVEL: 'Memorável',
  MUITO_BOM: 'Muito bom',
  BOM: 'Bom',
  NORMAL: 'Normal',
  NAO_GOSTEI_MUITO: 'Não gostei muito',
  RUIM: 'Ruim',
};

export const GAME_RATING_VARIANT: Record<GameRating, 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  LENDARIO: 'accent',
  MEMORAVEL: 'success',
  MUITO_BOM: 'success',
  BOM: 'info',
  NORMAL: 'neutral',
  NAO_GOSTEI_MUITO: 'warning',
  RUIM: 'danger',
};
