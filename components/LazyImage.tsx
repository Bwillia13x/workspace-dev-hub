import React, { useState, useEffect } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  className, 
  containerClassName,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Reset loaded state if src changes
    setIsLoaded(false);
  }, [src]);

  return (
    <div className={`relative ${containerClassName || ''} overflow-hidden`}>
      {/* Placeholder / Skeleton */}
      <div 
        className={`absolute inset-0 bg-slate-800 animate-pulse z-0 transition-opacity duration-700 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
      />
      
      {/* Actual Image */}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-700 ease-out relative z-10 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
    </div>
  );
};