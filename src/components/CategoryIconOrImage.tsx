import React, { useState, useEffect } from 'react';

export interface CategoryIconOrImageProps {
  icone?: string;
  imagemUrl?: string;
  nome?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  roundedClassName?: string;
}

const SIZE_STYLES = {
  xs: {
    container: 'w-5 h-5 text-[11px]',
    img: 'w-5 h-5',
    emoji: 'text-[11px]',
  },
  sm: {
    container: 'w-7 h-7 text-sm',
    img: 'w-7 h-7',
    emoji: 'text-sm',
  },
  md: {
    container: 'w-9 h-9 text-base',
    img: 'w-9 h-9',
    emoji: 'text-base',
  },
  lg: {
    container: 'w-11 h-11 text-2xl',
    img: 'w-11 h-11',
    emoji: 'text-2xl',
  },
  xl: {
    container: 'w-14 h-14 text-3xl',
    img: 'w-14 h-14',
    emoji: 'text-3xl',
  },
};

export const CategoryIconOrImage: React.FC<CategoryIconOrImageProps> = ({
  icone = '🏷️',
  imagemUrl,
  nome = 'Categoria',
  size = 'md',
  className = '',
  roundedClassName = 'rounded-xl',
}) => {
  const [imagemComErro, setImagemComErro] = useState(false);
  const sizeConfig = SIZE_STYLES[size] || SIZE_STYLES.md;
  const urlLimpa = imagemUrl?.trim();

  // Redefine status de erro se a URL mudar
  useEffect(() => {
    setImagemComErro(false);
  }, [urlLimpa]);

  if (urlLimpa && !imagemComErro) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs ${roundedClassName} ${sizeConfig.container} ${className}`}
        title={nome}
      >
        <img
          src={urlLimpa}
          alt={nome}
          className={`w-full h-full object-cover select-none transition-transform group-hover:scale-105 ${sizeConfig.img}`}
          loading="lazy"
          onError={() => setImagemComErro(true)}
        />
      </div>
    );
  }

  // Fallback para o Emoji
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 bg-slate-100 select-none ${roundedClassName} ${sizeConfig.container} ${className}`}
      title={nome}
      role="img"
      aria-label={nome}
    >
      <span className={`leading-none ${sizeConfig.emoji}`}>{icone || '🏷️'}</span>
    </div>
  );
};
