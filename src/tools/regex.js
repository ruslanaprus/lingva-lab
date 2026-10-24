export function runRegex(t, value) {
  return new Promise((resolve) => {
    let worker;
    try {
      worker = new Worker(new URL("../workers/regex-worker.js", import.meta.url));
    } catch {
      resolve({
        error:
          "Не вдалося запустити Worker. Відкрийте практикум через локальний HTTP-сервер.",
      });
      return;
    }
    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({
        error: "Обчислення перевищило 800 мс. Спростіть повтори та вкладені групи.",
      });
    }, 800);
    worker.onmessage = ({ data }) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(data);
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({ error: "Не вдалося виконати регулярний вираз." });
    };
    worker.postMessage({ ...value, corpus: t.corpus, type: t.type });
  });
}
