// Uso: node process_uniqueids.js 2025-05-01 2025-05-31

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { db } from './db.js';

const ERROR_LOG = path.resolve('./error_uniqueid.log');
const SUCCESS_LOG = path.resolve('./success_uniqueid.log');

const API_ENDPOINT = process.env.API_ENDPOINT;

const [, , DATE_FROM_ARG, DATE_TO_ARG] = process.argv;
const DATE_FROM = DATE_FROM_ARG || process.env.DATE_FROM || null;
const DATE_TO = DATE_TO_ARG || process.env.DATE_TO || null;

if (!DATE_FROM || !DATE_TO) {
    console.error('Uso: node process_uniqueids.js <DATE_FROM> <DATE_TO>');
    console.error('Ex: node process_uniqueids.js 2025-05-01 2025-05-31');
    process.exit(1);
}

// util
function appendLog(file, msg) {
    fs.appendFileSync(file, msg + '\n');
}

async function fetchUniqueIds(connection, fromDate, toDate) {
    const sql = `
    SELECT recording_unique_id AS uniqueid
    FROM vw_successful_calls_with_recordings
    WHERE DATE(call_init) BETWEEN ? AND ?
    GROUP BY recording_unique_id
    ORDER BY call_init ASC
  `;

    const [rows] = await connection.execute(sql, [fromDate, toDate]);
    return rows.map(r => r.uniqueid).filter(Boolean);
}

async function postUniqueId(uniqueid) {
    const resp = await axios.get(API_ENDPOINT + '/process-call', { recordingUniqueId: uniqueid });
    return resp;
}

async function main() {
    try {

        console.log(`Buscando uniqueids entre ${DATE_FROM} e ${DATE_TO}...`);
        const uniqueids = await fetchUniqueIds(db, DATE_FROM, DATE_TO);
        console.log(`Encontrados ${uniqueids.length} uniqueids.`);

        // processa linha-a-linha (sequencial)
        for (let i = 0; i < uniqueids.length; i++) {
            const uniqueid = uniqueids[i];
            try {
                console.log(`[${i + 1}/${uniqueids.length}] Enviando uniqueid=${uniqueid}`);
                const res = await postUniqueId(uniqueid);

                const msg = `${new Date().toISOString()} | OK | ${uniqueid} | status:${res.status}`;
                appendLog(SUCCESS_LOG, msg);
                console.log(`  ✅ ${uniqueid} -> ${res.status}`);
            } catch (err) {
                const errMsg = `${new Date().toISOString()} | ERROR | ${uniqueid} | ${err.message}`;
                appendLog(ERROR_LOG, errMsg);
                console.error(`  ❌ ${uniqueid} -> ${err.message}`);
            }
        }

        console.log('Processamento concluído.');
    } catch (err) {
        console.error('Erro geral:', err);
    } finally {
        if (db && db.end) await db.end();
    }
}

(async () => {
    main()
        .then(() => console.log('🚀 Upload de chamadas concluído!'))
        .catch(err => console.error('Erro geral:', err));
})();