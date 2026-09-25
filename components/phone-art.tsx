'use client';
import {useState} from 'react';
import Image from 'next/image';
import {PhoneModel} from '@/lib/data/schema';
export function PhoneArt({brand,small=false,image}:{brand:string;small?:boolean;image?:PhoneModel['image']}){
 const [failed,setFailed]=useState(false);const [alternate,setAlternate]=useState(false);
 const src=alternate?image?.alternate:image?.primary;
 return <div className={`phone-art ${small?'small':''}`} data-brand={brand}>
 {src&&!failed?<Image src={src} alt={`${brand} phone`} width={small?68:116} height={small?92:156} unoptimized onError={()=>image?.alternate&&!alternate?setAlternate(true):setFailed(true)}/>:<svg viewBox="0 0 110 160" width={small?68:110} height={small?96:160} role="img" aria-label="تصویر نمادین دستگاه"><rect x={image?.fallback==='fold'?8:21} y="3" width={image?.fallback==='fold'?94:68} height="150" rx="13" fill="currentColor" opacity=".09"/><rect x="25" y="7" width="60" height={image?.fallback==='flip'?72:140} rx="10" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="38" cy="23" r="7" fill="currentColor" opacity=".65"/><circle cx="38" cy="42" r="7" fill="currentColor" opacity=".45"/><circle cx="56" cy="32" r="7" fill="currentColor" opacity=".25"/><path d="M44 133h20" stroke="currentColor" strokeWidth="2"/></svg>}
 <span>{brand}</span><small>{src&&!failed?'تصویر محصول':'تصویر نمادین'}</small></div>
}
