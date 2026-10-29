'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Eraser,
  Code,
  Eye,
} from 'lucide-react';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Descreva os detalhes, tópicos e diferenciais do serviço...',
  className = '',
  minHeight = '120px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showCode, setShowCode] = useState(false);
  const [activeFormats, setActiveFormats] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    unorderedList: boolean;
    orderedList: boolean;
    justifyLeft: boolean;
    justifyCenter: boolean;
    justifyRight: boolean;
    justifyFull: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
  });

  // Atualiza os estados ativos das ferramentas de acordo com a seleção atual
  const updateActiveStates = useCallback(() => {
    if (typeof document === 'undefined' || !editorRef.current) return;
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        justifyFull: document.queryCommandState('justifyFull'),
      });
    } catch (_e) {
      // Alguns navegadores restringem queryCommandState fora de foco
    }
  }, []);

  // Sincroniza o conteúdo inicial ou externo com o contentEditable
  useEffect(() => {
    if (editorRef.current && !showCode) {
      if (editorRef.current.innerHTML !== (value || '')) {
        // Se for texto plano com quebras de linha e sem tags HTML, normaliza para parágrafos
        if (value && !/<[a-z][\s\S]*>/i.test(value)) {
          const paragraphs = value
            .split('\n')
            .map((line) => {
              const trimmed = line.trim();
              if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                return `<li>${trimmed.replace(/^[-•]\s*/, '')}</li>`;
              }
              return trimmed ? `<p>${trimmed}</p>` : '<br>';
            })
            .join('');
          editorRef.current.innerHTML = paragraphs;
        } else {
          editorRef.current.innerHTML = value || '';
        }
      }
    }
  }, [value, showCode]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // Tratar caso vazio do contentEditable (que muitas vezes deixa <p><br></p>)
      const isEmpty =
        !html || html === '<p><br></p>' || html === '<div><br></div>' || html === '<br>';
      onChange(isEmpty ? '' : html);
      updateActiveStates();
    }
  };

  const executeCommand = (command: string, arg?: string) => {
    if (showCode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput();
    updateActiveStates();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Atalhos úteis: Ctrl+B, Ctrl+I, Ctrl+U
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        executeCommand('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        executeCommand('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        executeCommand('underline');
      }
    }
  };

  const handleEditorWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = editorRef.current;
    if (!el) return;

    // Se o elemento possui conteúdo rolável, rola o editor diretamente e bloqueia o evento de vazar para a tela de baixo
    if (el.scrollHeight > el.clientHeight) {
      el.scrollTop += e.deltaY;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      style={{ overscrollBehavior: 'contain' }}
      className={`border border-stone-300 rounded-xl bg-white shadow-xs focus-within:border-[#C9A227] focus-within:ring-2 focus-within:ring-[#C9A227]/30 transition-all overscroll-contain ${className}`}
    >
      {/* BARRA DE FERRAMENTAS DO EDITOR */}
      <div className="bg-stone-50 border-b border-stone-200 px-2.5 py-1.5 flex flex-wrap items-center gap-1 rounded-t-xl select-none">
        {/* GRUPO: ESTILOS DE TEXTO */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-stone-200">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('bold');
            }}
            title="Negrito (Ctrl+B)"
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeFormats.bold
                ? 'bg-[#3B0B14] text-[#C9A227]'
                : 'text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('italic');
            }}
            title="Itálico (Ctrl+I)"
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              activeFormats.italic
                ? 'bg-[#3B0B14] text-[#C9A227]'
                : 'text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('underline');
            }}
            title="Sublinhar (Ctrl+U)"
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              activeFormats.underline
                ? 'bg-[#3B0B14] text-[#C9A227]'
                : 'text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GRUPO: LISTAS E TÓPICOS */}
        <div className="flex items-center gap-0.5 px-1 border-r border-stone-200">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('insertUnorderedList');
            }}
            title="Marcadores / Tópicos com Bullets"
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              activeFormats.unorderedList
                ? 'bg-[#3B0B14] text-[#C9A227]'
                : 'text-stone-700 hover:bg-stone-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('insertOrderedList');
            }}
            title="Lista Numerada"
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              activeFormats.orderedList
                ? 'bg-[#3B0B14] text-[#C9A227]'
                : 'text-stone-700 hover:bg-stone-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GRUPO: ALINHAMENTO */}
        <div className="flex items-center gap-0.5 px-1 border-r border-stone-200">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('justifyLeft');
            }}
            title="Alinhar à Esquerda"
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              activeFormats.justifyLeft
                ? 'bg-[#3B0B14] text-[#C9A227]'
                : 'text-stone-700 hover:bg-stone-200'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('justifyCenter');
            }}
            title="Centralizar"
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              activeFormats.justifyCenter
                ? 'bg-[#3B0B14] text-[#C9A227]'
                : 'text-stone-700 hover:bg-stone-200'
            }`}
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('justifyRight');
            }}
            title="Alinhar à Direita"
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              activeFormats.justifyRight
                ? 'bg-[#3B0B14] text-[#C9A227]'
                : 'text-stone-700 hover:bg-stone-200'
            }`}
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('justifyFull');
            }}
            title="Justificar"
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              activeFormats.justifyFull
                ? 'bg-[#3B0B14] text-[#C9A227]'
                : 'text-stone-700 hover:bg-stone-200'
            }`}
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* LIMPAR FORMATAÇÃO */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('removeFormat');
          }}
          title="Limpar Formatação do Texto Selecionado"
          className="p-1.5 rounded-lg text-xs text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>

        {/* ALTERNAR VISUAL / CÓDIGO HTML */}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            title={showCode ? 'Voltar para modo Visual' : 'Editar código HTML direto'}
            className="p-1.5 rounded-lg text-xs text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-1"
          >
            {showCode ? (
              <>
                <Eye className="w-3.5 h-3.5 text-[#3B0B14]" />
                <span className="text-[10px] font-bold text-stone-700">Visual</span>
              </>
            ) : (
              <>
                <Code className="w-3.5 h-3.5" />
                <span className="text-[10px] text-stone-500">HTML</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ÁREA DE DIGITAÇÃO WYSIWYG OU CÓDIGO FONTE */}
      {showCode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onWheel={(e) => e.stopPropagation()}
          placeholder={placeholder}
          style={{ minHeight, overscrollBehavior: 'contain' }}
          className="w-full p-3 font-mono text-xs text-stone-800 bg-stone-50/50 outline-none resize-y rounded-b-xl focus:outline-none overscroll-contain"
        />
      ) : (
        <div className="relative">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyUp={updateActiveStates}
            onMouseUp={updateActiveStates}
            onKeyDown={handleKeyDown}
            onWheel={handleEditorWheel}
            style={{ minHeight, overscrollBehavior: 'contain' }}
            data-placeholder={placeholder}
            className="rich-text-editor-area p-3 text-xs text-stone-900 outline-none leading-relaxed overflow-y-auto max-h-[300px] rounded-b-xl overscroll-contain"
          />
          {(!value || value === '<p><br></p>' || value === '<br>') && (
            <div
              onClick={() => editorRef.current?.focus()}
              className="absolute top-3 left-3 text-xs text-stone-400 pointer-events-none select-none"
            >
              {placeholder}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
