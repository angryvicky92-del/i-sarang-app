import React from 'react';
import customIcon from '../assets/custom_icon.png';

export default function Logo({ width = 140, height = 45, className = '', style = {} }) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 160 50" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      style={style}
    >
      {/* 집 모양 및 체크마크 그룹 */}
      <g transform="translate(10, 5) scale(0.4)">
        {/* 집 지붕과 외곽선 (Dark Green) */}
        <path d="M 15 50 L 50 15 L 85 50 L 85 90 A 5 5 0 0 1 80 95 L 20 95 A 5 5 0 0 1 15 90 Z" stroke="var(--primary-dark, #2D4C3B)" strokeWidth="8" strokeLinejoin="round" fill="none"/>
        <path d="M 5 60 L 50 15 L 95 60" stroke="var(--primary-dark, #2D4C3B)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        
        {/* 지붕 위 새싹 잎 (Light Green) */}
        <path d="M 32 30 C 15 30 15 15 32 15 C 32 15 32 30 32 30 Z" fill="var(--primary, #75BA57)"/>
        <path d="M 32 30 C 32 15 48 15 48 30 C 48 30 32 30 32 30 Z" fill="var(--primary, #75BA57)"/>
        <path d="M 32 30 L 32 38" stroke="var(--primary, #75BA57)" strokeWidth="4" strokeLinecap="round"/>

        {/* 체크마크 (Light Green) 집 바깥쪽으로 뻗어 나가는 형태 */}
        <path d="M 35 60 L 58 85 L 115 25" stroke="var(--primary, #75BA57)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      
      {/* 텍스트 영역 대체할 새로운 아이콘 이미지 */}
      <image href={customIcon} x="58" y="5" width="40" height="40" />
    </svg>
  );
}
