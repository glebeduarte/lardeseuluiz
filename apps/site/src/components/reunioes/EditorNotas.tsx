import { forwardRef, useImperativeHandle, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { pt } from "@blocknote/core/locales";
import "@blocknote/mantine/style.css";
import "./editor-notas.css";
import { enderecoFixo, enviarArquivoReuniao, resolverEndereco, type Blocos } from "@/lib/reunioes";

// Editor em blocos das Reuniões (pauta e anotações), no estilo do Notion.
// "/" abre o menu de formatações; atalhos de markdown funcionam ao digitar (#, ##, -, 1., [], >, **negrito**);
// imagens, vídeos, áudios e arquivos podem ser enviados pelo menu, arrastados ou colados.
// Este arquivo é carregado sob demanda (React.lazy), porque o editor é pesado.

export interface EditorNotasRef {
  /** Conteúdo atual em markdown (para copiar e colar em outro lugar). */
  emMarkdown: () => string;
}

interface Props {
  reuniaoId: string;
  inicial: Blocos | null;
  aoMudar: (blocos: Blocos) => void;
  /** Texto que aparece na linha vazia. */
  dica?: string;
  /** Altura mínima da área de escrita. */
  tamanho?: "pauta" | "anotacoes";
}

const EditorNotas = forwardRef<EditorNotasRef, Props>(({ reuniaoId, inicial, aoMudar, dica, tamanho = "anotacoes" }, ref) => {
  const dicionario = useMemo(() => ({
    ...pt,
    placeholders: { ...pt.placeholders, default: dica || "Escreva aqui, ou digite / para ver as formatações" },
    file_panel: {
      ...pt.file_panel,
      upload: {
        ...pt.file_panel.upload,
        title: "Enviar",
        file_placeholder: { image: "Escolher imagem", video: "Escolher vídeo", audio: "Escolher áudio", file: "Escolher arquivo" },
        upload_error: "Não foi possível enviar o arquivo (limite de 50 MB)",
      },
      embed: { ...pt.file_panel.embed, title: "Colar link", url_placeholder: "Cole o endereço (link)" },
    },
  }), [dica]);

  const editor = useCreateBlockNote({
    initialContent: inicial && inicial.length ? inicial : undefined,
    dictionary: dicionario,
    uploadFile: async (arquivo: File) => enderecoFixo(await enviarArquivoReuniao(reuniaoId, arquivo)),
    resolveFileUrl: resolverEndereco,
  });

  useImperativeHandle(ref, () => ({ emMarkdown: () => editor.blocksToMarkdownLossy(editor.document) }), [editor]);

  return (
    <div className={`lsl-editor lsl-editor--${tamanho}`}>
      <BlockNoteView editor={editor} theme="light" onChange={() => aoMudar(editor.document)} />
    </div>
  );
});
EditorNotas.displayName = "EditorNotas";

export default EditorNotas;
