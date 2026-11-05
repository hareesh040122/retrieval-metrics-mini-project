// eval.js: MRR and Recall@10 for keyword vs semantic search
const fs = require('fs');

// --- 1. Load the inputs (already done for you) -----------------------------
function loadTestSet(path) {
  const lines = fs.readFileSync(path, 'utf8').trim().split('\n').slice(1);
  return lines.map(line => {
    const [query, ids] = line.split(',');
    return { query, correctIds: ids.split(';').map(Number) };
  });
}
const testSet = loadTestSet('test-set.csv');
const results = JSON.parse(fs.readFileSync('search-results.json', 'utf8'));

// --- 2. Reciprocal Rank ----------------------------------------------------
// Helper: the 1-based rank of the first correct id, or null if it is a miss.
function rankOf(rankedIds, correctIds) {
  const correct = correctIds.map(Number);
  for (let i = 0; i < rankedIds.length && i < 10; i++) {
    if (correct.includes(Number(rankedIds[i]))) {
      return i + 1; // index 0 = rank 1
    }
  }
  return null; // miss
}

function reciprocalRank(rankedIds, correctIds) {
  const rank = rankOf(rankedIds, correctIds);
  return rank === null ? 0 : 1 / rank;
}

// --- 3. Evaluation loop ----------------------------------------------------
const kwRRs = [];
const semRRs = [];
let kwHits = 0;
let semHits = 0;
const rows = [];

for (const { query, correctIds } of testSet) {
  const kwList = results[query].keyword;
  const semList = results[query].semantic;

  const kwRR = reciprocalRank(kwList, correctIds);
  const semRR = reciprocalRank(semList, correctIds);

  kwRRs.push(kwRR);
  semRRs.push(semRR);
  if (kwRR > 0) kwHits++;
  if (semRR > 0) semHits++;

  rows.push({
    query,
    kwRank: rankOf(kwList, correctIds),
    semRank: rankOf(semList, correctIds),
  });
}

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

const keywordMRR = mean(kwRRs);
const semanticMRR = mean(semRRs);
const keywordRecall = kwHits / testSet.length;
const semanticRecall = semHits / testSet.length;

// --- 4. Print the markdown comparison table --------------------------------
console.log('| Query | Keyword rank | Semantic rank |');
console.log('|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.query} | ${r.kwRank ?? 'miss'} | ${r.semRank ?? 'miss'} |`);
}
console.log(
  `| **Summary** | **MRR ${keywordMRR.toFixed(2)} · Recall@10 ${keywordRecall.toFixed(2)}** | ` +
  `**MRR ${semanticMRR.toFixed(2)} · Recall@10 ${semanticRecall.toFixed(2)}** |`
);