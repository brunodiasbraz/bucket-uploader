// Uso: node reprocess_uniqueids.js

import fs from "fs";
import path from "path";
import axios from "axios";

const ERROR_LOG = path.resolve("./error_uniqueid.log");
const SUCCESS_LOG = path.resolve("./success_uniqueid_reprocess.log");
const ERROR_LOG_RETRY = path.resolve("./error_uniqueid_reprocess.log");

const API_ENDPOINT = process.env.API_ENDPOINT;

function appendLog(file, msg) {
  fs.appendFileSync(file, msg + "\n");
}

// Lê todos os uniqueids do arquivo de erro
function readErrorUniqueIds() {
  if (!fs.existsSync(ERROR_LOG)) {
    console.error(`Arquivo ${ERROR_LOG} não encontrado.`);
    process.exit(1);
  }

  const lines = fs
    .readFileSync(ERROR_LOG, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // tenta extrair o uniqueid de linhas no formato: "2025-11-01T14:00Z | ERROR | 123456.78 | ..."
  const ids = lines
    .map((line) => {
      const match = line.match(/\|\s*ERROR\s*\|\s*([\w.-]+)/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  return Array.from(new Set(ids)); // remove duplicados
}

async function postUniqueId(uniqueid) {
  const resp = await axios.get(API_ENDPOINT + "/process-call", {
    params: { recordingUniqueId: uniqueid },
  });
  console.log('resp :>> ', resp);
  return resp;
}

async function main() {
  const uniqueids = readErrorUniqueIds();
  console.log(`Encontrados ${uniqueids.length} uniqueids com erro.`);

  for (let i = 0; i < uniqueids.length; i++) {
    const uniqueid = uniqueids[i];
    try {
      console.log(
        `[${i + 1}/${uniqueids.length}] Reenviando uniqueid=${uniqueid}`
      );
      const res = await postUniqueId(uniqueid);
      const msg = `${new Date().toISOString()} | OK | ${uniqueid} | status:${
        res.status
      }`;
      appendLog(SUCCESS_LOG, msg);
      console.log(`  ✅ ${uniqueid} -> ${res.status}`);
    } catch (err) {
      const errMsg = `${new Date().toISOString()} | ERROR | ${uniqueid} | ${
        err.message
      }`;
      appendLog(ERROR_LOG_RETRY, errMsg);
      console.error(`  ❌ ${uniqueid} -> ${err.message}`);
    }
  }

  console.log("♻️ Reprocessamento concluído.");
}

(async () => {
  main()
    .then(() => console.log("🚀 Reprocessamento finalizado!"))
    .catch((err) => console.error("Erro geral:", err));
})();
