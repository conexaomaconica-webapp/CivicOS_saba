'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  // Remove tags maliciosas e scripts
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  clean = clean.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  clean = clean.replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '');
  // Remove event handlers em atributos (onclick, onerror, onload, etc.)
  clean = clean.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*[^>\s]+/gi, '');
  // Remove links javascript:
  clean = clean.replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, '');
  // Preserva apenas atributos de estilo seguros (text-align)
  clean = clean.replace(/style\s*=\s*(['"])(.*?)\1/gi, (_match, quote, styleContent) => {
    const alignMatch = styleContent.match(/text-align\s*:\s*(left|center|right|justify)/i);
    if (alignMatch) {
      return `style=${quote}text-align: ${alignMatch[1].toLowerCase()};${quote}`;
    }
    return '';
  });
  return clean;
}

/**
 * Converte texto puro com tópicos (- ou •) em HTML limpo caso não seja HTML
 */
export function formatPlainTextTopics(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  let inList = false;
  let html = '';

  for (const line of lines) {
    const trimmed = line.trim();
    // Verifica se a linha é um tópico (- item, * item, • item)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!inList) {
        html += '<ul class="list-disc pl-5 space-y-1 my-1">';
        inList = true;
      }
      html += `<li>${bulletMatch[1]}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (trimmed) {
        html += `<p class="my-0.5">${trimmed}</p>`;
      }
    }
  }

  if (inList) {
    html += '</ul>';
  }

  return html || text;
}

type FormattedTextProps = {
  content?: string | null;
  className?: string;
  collapsible?: boolean;
  maxCollapsedLength?: number;
};

/**
 * FormattedText: renderizador seguro para descrições ricas, tópicos e formatações de texto.
 * Preserva alinhamento, listas de marcadores (bullets), negrito, itálico e quebras de linha.
 */
export function FormattedText({
  content,
  className = '',
  collapsible = false,
  maxCollapsedLength = 220,
}: FormattedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content || !content.trim()) return null;

  const raw = content.trim();
  const isHtml = /<[a-z][\s\S]*>/i.test(raw);
  const processedHtml = isHtml ? sanitizeHtml(raw) : formatPlainTextTopics(raw);

  const shouldCollapse = collapsible && raw.length > maxCollapsedLength;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div
        className={`formatted-content text-stone-600 transition-all ${
          shouldCollapse && !isExpanded ? 'line-clamp-3 overflow-hidden' : ''
        }`}
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />

      {shouldCollapse && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4B161B] hover:text-[#C9A227] transition-colors cursor-pointer pt-0.5"
        >
          <span>{isExpanded ? 'Ver menos' : 'Ver mais detalhes'}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}
