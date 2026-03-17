import { useEffect, useState } from "react";

type LegalDocumentPageProps = {
  documentPath: string;
  expectedFile: string;
};

type DocumentState =
  | { status: "loading" }
  | { status: "ready"; content: string }
  | { status: "missing" }
  | { status: "error" };

export function LegalDocumentPage({ documentPath, expectedFile }: LegalDocumentPageProps) {
  const [state, setState] = useState<DocumentState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    setState({ status: "loading" });

    fetch(documentPath, {
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    })
      .then(async (response) => {
        if (response.status === 404) {
          setState({ status: "missing" });
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed to load legal document: ${response.status}`);
        }

        const content = (await response.text()).trim();
        setState(content ? { status: "ready", content } : { status: "missing" });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        setState({ status: "error" });
      });

    return () => controller.abort();
  }, [documentPath]);

  if (state.status === "loading") {
    return <p className="text-[var(--app-muted)]">Загружаем текст документа...</p>;
  }

  if (state.status === "missing") {
    return (
      <article className="space-y-4">
        <p className="text-[var(--app-muted)]">
          Документ не установлен. Добавьте отдельный текстовый файл в `LEGAL_DOCS_DIR` и перезапустите приложение.
        </p>
        <div className="rounded-[1.25rem] bg-[var(--panel-muted)] px-4 py-4 text-sm leading-6 text-[var(--app-fg)]">
          Ожидаемый файл: <strong>{expectedFile}</strong>
        </div>
      </article>
    );
  }

  if (state.status === "error") {
    return <p className="text-rose-500">Не удалось загрузить документ. Проверьте `LEGAL_DOCS_DIR` и доступ к файлу.</p>;
  }

  return (
    <article className="space-y-4">
      <a
        href={documentPath}
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-full bg-[var(--panel-muted)] px-4 py-3 text-sm font-semibold text-brand-500"
      >
        Открыть исходный .txt
      </a>
      <div className="rounded-[1.5rem] bg-[var(--panel-muted)] px-5 py-5 text-[var(--app-fg)]">
        <div className="whitespace-pre-wrap break-words text-base leading-7">{state.content}</div>
      </div>
    </article>
  );
}
