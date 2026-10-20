// ============================================================================
// Google Sheets 題庫設定
// ============================================================================

// 請將這個字串替換成 Google Sheets 的 CSV 網址；不需要修改 index.html。
// 取得方式一：Google 試算表選「檔案」→「共用」→「發布到網路」，選工作表與 CSV
// 後按「發布」，再複製產生的網址。
// 取得方式二：使用下列格式的公開匯出網址：
// https://docs.google.com/spreadsheets/d/試算表ID/export?format=csv&gid=工作表GID
// 試算表必須已發布到網路或以公開可讀方式提供，否則瀏覽器 fetch 會被權限或 CORS 阻擋。
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT690pXfw0CqpCiHb8M4Cy31NHy8FDMhmdwDgadlfhjI54DRRg8qPsm-T29sy2ZDrQEDyxY5Jij-kDZ/pub?gid=627247359&single=true&output=csv";

// 設定每次測驗抽出的題目數量。
const QUESTIONS_PER_QUIZ = 5;

// 設定每一題的配分。
const POINTS_PER_QUESTION = 20;

// 設定測驗需要的 CSV 標題欄位名稱。
const REQUIRED_HEADERS = [
  "question",
  "option1",
  "option2",
  "option3",
  "option4",
  "answer"
];

// ============================================================================
// 測驗狀態與介面元件
// ============================================================================

// 儲存從 Google Sheets 讀取並解析後的完整題庫。
let questionBank = [];

// 儲存本次測驗隨機抽出的五題。
let quizQuestions = [];

// 儲存目前正在作答的題號索引，從 0 開始。
let currentQuestion = 0;

// 儲存目前測驗答對的題數。
let correctCount = 0;

// 儲存四個選項按鈕。
let optionButtons = [];

// 儲存下一題或查看成績按鈕。
let nextButton = null;

// 儲存重新開始按鈕。
let restartButton = null;

// 儲存重新載入題庫按鈕。
let reloadButton = null;

// 記錄目前題目是否已經作答。
let hasAnswered = false;

// 儲存使用者選擇的選項文字。
let selectedOption = "";

// 儲存答題動畫開始的時間。
let animationStartTime = 0;

// 儲存煙火粒子資料。
let fireworks = [];

// 儲存低分加油特效粒子資料。
let encouragementParticles = [];

// 儲存結果特效開始的時間。
let resultEffectStartTime = 0;

// 記錄題庫是否正在載入。
let isLoading = false;

// 儲存題庫載入錯誤訊息；空字串代表目前沒有錯誤。
let loadErrorMessage = "";

// 儲存響應式版面計算結果。
let layoutInfo = {
  contentWidth: 0,
  questionTop: 0,
  questionHeight: 0,
  questionWidth: 0,
  optionTop: 0,
  optionWidth: 0,
  optionHeight: 0,
  optionGap: 0,
  optionEnd: 0,
  hintY: 0,
  actionY: 0,
  actionHeight: 0,
  showHint: false
};

// ============================================================================
// 顏色、字型與基本設定
// ============================================================================

// 設定畫布背景顏色。
const backgroundColor = "#84a98c";

// 設定題目方框背景顏色。
const questionBoxColor = "#415a77";

// 設定正確答案與答對選項顏色。
const correctColor = "#3a86ff";

// 設定答錯使用者選項顏色。
const wrongColor = "#da627d";

// 設定尚未作答選項的背景顏色。
const optionColor = "#52796f";

// 設定下一題、重新開始等操作按鈕顏色。
const actionColor = "#386641";

// 設定畫布上的主要字型。
const mainFont = "Chiron Sung HK";

// 設定 HTML 按鈕使用的字型。
const buttonFont = "LXGW WenKai Mono TC";

// ============================================================================
// p5.js 生命週期函式
// ============================================================================

// p5.js 初始化函式，只會在頁面開始時執行一次。
function setup() {
  // 建立符合瀏覽器視窗大小的畫布。
  createCanvas(windowWidth, windowHeight);

  // 設定頁面的基本樣式，避免 p5.js 元件受到瀏覽器預設樣式影響。
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";
  document.body.style.backgroundColor = backgroundColor;
  document.body.style.touchAction = "manipulation";

  // 設定 p5.js 畫布文字使用指定的 Google 字型。
  textFont(mainFont);

  // 建立重新載入題庫按鈕，之後會依畫面大小自動定位。
  createReloadButton();

  // 立即從 Google Sheets CSV 網址讀取最新題庫。
  loadQuestionBank();
}

// p5.js 每一幀都會執行的繪圖函式。
function draw() {
  // 使用指定的綠色填滿整個畫布背景。
  background(backgroundColor);

  // 每一幀重新計算版面，讓手機旋轉或視窗改變時能自動調整。
  calculateResponsiveLayout();

  // 重新定位固定存在的重新載入按鈕。
  positionReloadButton();

  // 將 p5.js 繪圖原點移到畫布水平中央，方便所有內容置中。
  translate(width / 2, 0);

  // 題庫尚未完成讀取時，顯示載入畫面。
  if (isLoading) {
    drawLoadingScreen();
    return;
  }

  // 題庫讀取或解析失敗時，顯示錯誤訊息與使用說明。
  if (loadErrorMessage !== "") {
    drawDataErrorScreen();
    return;
  }

  // 題庫成功後但題目數不足時，顯示資料錯誤畫面。
  if (questionBank.length < QUESTIONS_PER_QUIZ) {
    drawDataErrorScreen();
    return;
  }

  // 還有題目未完成時，顯示作答畫面。
  if (currentQuestion < quizQuestions.length) {
    drawQuizScreen();

    // 作答後讓正確答案上下跳動、錯誤選項左右移動。
    if (hasAnswered) {
      animateAnsweredOptions();
    }

    return;
  }

  // 五題完成後顯示成績畫面。
  drawResultScreen();

  // 根據分數顯示煙火或加油特效。
  drawResultEffect();

  // 結果畫面需要重新開始按鈕；只在尚未建立時建立一次。
  if (!restartButton) {
    createRestartButton();
  }
}

// 當瀏覽器視窗大小或手機方向改變時執行。
function windowResized() {
  // 重新調整畫布大小。
  resizeCanvas(windowWidth, windowHeight);

  // 立即重新計算版面並移動所有 HTML 按鈕。
  calculateResponsiveLayout();
  repositionAllButtons();
}

// ============================================================================
// Google Sheets CSV 載入、快取更新與解析
// ============================================================================

// 從 Google Sheets CSV 網址讀取最新題庫。
async function loadQuestionBank() {
  // 清除上一輪狀態，讓畫面顯示新的載入流程。
  isLoading = true;
  loadErrorMessage = "";
  questionBank = [];
  quizQuestions = [];
  currentQuestion = 0;
  clearQuizButtons();
  resetResultEffects();
  updateReloadButtonState();

  // 檢查老師是否仍未替換佔位網址。
  if (SHEET_CSV_URL.includes("請替換成你的 Google Sheets CSV 網址")) {
    // 使用繁體中文顯示清楚的設定提醒。
    loadErrorMessage = "尚未設定 SHEET_CSV_URL，請先貼上 Google Sheets 的公開 CSV 網址。";
    isLoading = false;
    updateReloadButtonState();
    return;
  }

  try {
    // 以時間戳記建立 cache-busting 參數，避免取得瀏覽器或 CDN 的舊 CSV。
    const separator = SHEET_CSV_URL.includes("?") ? "&" : "?";
    const cacheBustUrl = `${SHEET_CSV_URL}${separator}cacheBust=${Date.now()}`;

    // 使用 fetch 取得公開 CSV；no-store 進一步要求瀏覽器不要使用快取。
    const response = await fetch(cacheBustUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Accept": "text/csv,text/plain;q=0.9,*/*;q=0.8"
      }
    });

    // HTTP 狀態不是 2xx 時，主動轉成可讀的錯誤。
    if (!response.ok) {
      throw new Error(`Google Sheets 回應 HTTP ${response.status}`);
    }

    // 以文字方式讀取 CSV，保留欄位中的逗號與換行供自訂 parser 處理。
    const csvText = await response.text();

    // 解析 CSV 並驗證必要標題與每一列資料。
    const parsedQuestions = parseQuestionCSV(csvText);

    // 題庫至少需要五題，才能進行每次五題的測驗。
    if (parsedQuestions.length < QUESTIONS_PER_QUIZ) {
      throw new Error(`題庫目前只有 ${parsedQuestions.length} 題，至少需要 ${QUESTIONS_PER_QUIZ} 題。`);
    }

    // 將成功解析的題庫存入全域狀態。
    questionBank = parsedQuestions;
    isLoading = false;
    loadErrorMessage = "";
    updateReloadButtonState();

    // 題庫成功後立即開始一次全新的隨機測驗。
    startQuiz();
  } catch (error) {
    // 將錯誤印到主控台，方便老師使用瀏覽器開發者工具除錯。
    console.error("Google Sheets 題庫載入失敗：", error);

    // 將錯誤訊息顯示在網站畫面上，避免只留在主控台。
    loadErrorMessage = formatLoadError(error);
    isLoading = false;
    questionBank = [];
    quizQuestions = [];
    updateReloadButtonState();
  }
}

// 將不同來源的載入錯誤整理成適合使用者閱讀的訊息。
function formatLoadError(error) {
  // 取得原始錯誤文字；若瀏覽器沒有提供內容就使用預設訊息。
  const rawMessage = error && error.message ? error.message : "未知錯誤";

  // fetch 常見的 TypeError 通常與網址、公開權限或 CORS 有關。
  if (rawMessage === "Failed to fetch" || rawMessage.includes("NetworkError")) {
    return "無法讀取 Google Sheets，請確認網址、發布狀態、公開權限與 CORS 設定。";
  }

  // 保留自訂 parser 或 HTTP 回應提供的具體錯誤。
  return rawMessage;
}

// 解析支援雙引號、欄位逗號、欄位換行與雙引號跳脫的 CSV 文字。
function parseCSV(text) {
  // 建立所有列與目前正在處理的列、欄位。
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  // 逐字元讀取 CSV；不能使用 split(',')，才能正確處理引號與逗號。
  for (let index = 0; index < text.length; index += 1) {
    // 取得目前字元與下一個字元。
    const character = text[index];
    const nextCharacter = text[index + 1];

    // 引號內的內容需要特別處理雙引號跳脫與欄位換行。
    if (insideQuotes) {
      // 連續兩個雙引號代表欄位內的一個雙引號。
      if (character === '"' && nextCharacter === '"') {
        currentField += '"';
        index += 1;
      // 單獨的雙引號代表離開引號欄位。
      } else if (character === '"') {
        insideQuotes = false;
      // 其他字元，包括逗號與換行，都屬於欄位內容。
      } else {
        currentField += character;
      }

      continue;
    }

    // 未在引號內時，欄位開頭的雙引號會開始引號欄位。
    if (character === '"' && currentField.trim() === "") {
      insideQuotes = true;
      continue;
    }

    // 逗號代表目前欄位結束。
    if (character === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    // CRLF 或 LF 都代表目前資料列結束。
    if (character === "\n" || character === "\r") {
      // 遇到 CRLF 時跳過後面的 LF，避免多出空白列。
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      // 將最後一個欄位加入目前資料列。
      currentRow.push(currentField);
      currentField = "";

      // 忽略完全空白的資料列。
      if (currentRow.some((value) => value.trim() !== "")) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    // 一般文字直接累積到目前欄位。
    currentField += character;
  }

  // CSV 在引號內結束代表格式不完整，應該明確顯示錯誤。
  if (insideQuotes) {
    throw new Error("CSV 格式錯誤：有尚未關閉的雙引號。 ");
  }

  // 補上檔案最後一列，即使檔案末尾沒有換行。
  currentRow.push(currentField);
  if (currentRow.some((value) => value.trim() !== "")) {
    rows.push(currentRow);
  }

  // 沒有任何資料時回傳空陣列，交給上層顯示題庫錯誤。
  return rows;
}

// 將 CSV 列解析成測驗題目物件，並驗證必要欄位。
function parseQuestionCSV(csvText) {
  // 解析所有 CSV 列。
  const rows = parseCSV(csvText);

  // 至少需要標題列與一筆題目資料。
  if (rows.length < 2) {
    throw new Error("CSV 必須包含標題列與至少一筆題目資料。 ");
  }

  // 移除 UTF-8 BOM、前後空白並統一標題大小寫。
  const headers = rows[0].map((header) =>
    header.replace(/^\uFEFF/, "").trim().toLowerCase()
  );

  // 找出每個必要欄位在 CSV 中的索引位置。
  const headerIndex = {};
  for (const requiredHeader of REQUIRED_HEADERS) {
    const index = headers.indexOf(requiredHeader);
    if (index === -1) {
      throw new Error(`CSV 缺少必要標題欄位：${requiredHeader}`);
    }
    headerIndex[requiredHeader] = index;
  }

  // 建立解析後的題目陣列。
  const parsedQuestions = [];

  // 從第二列開始逐題解析；列號加一後符合試算表常見的列號。
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    // 取得目前 CSV 列。
    const row = rows[rowIndex];

    // 讀取欄位時統一去除前後空白，避免答案比對因空白失敗。
    const getValue = (headerName) =>
      (row[headerIndex[headerName]] || "").trim();

    // 依規定標題欄位讀取題目、四個選項與正確答案。
    const question = getValue("question");
    const options = [
      getValue("option1"),
      getValue("option2"),
      getValue("option3"),
      getValue("option4")
    ];
    const answer = getValue("answer");

    // 檢查每一欄是否都有內容，避免產生無法作答的題目。
    if (question === "" || options.some((option) => option === "") || answer === "") {
      throw new Error(`CSV 第 ${rowIndex + 1} 列有空白的題目、選項或答案欄位。`);
    }

    // 正確答案必須與四個選項其中之一完全相同，才能正確判分。
    if (!options.includes(answer)) {
      throw new Error(`CSV 第 ${rowIndex + 1} 列的 answer 不在 option1～option4 中。`);
    }

    // 將驗證後的題目加入題庫。
    parsedQuestions.push({
      question: question,
      options: options,
      answer: answer
    });
  }

  // 回傳完整解析結果。
  return parsedQuestions;
}

// ============================================================================
// 測驗流程與按鈕
// ============================================================================

// 從完整題庫重新抽出五題並重新排列選項。
function startQuiz() {
  // 題庫不足五題時不建立測驗，避免 slice 後出現不完整測驗。
  if (questionBank.length < QUESTIONS_PER_QUIZ) {
    return;
  }

  // 清除上一輪測驗的 HTML 按鈕。
  clearQuizButtons();

  // 清除上一輪結果特效。
  resetResultEffects();

  // 複製題目物件後隨機排列，避免改動原始題庫。
  const shuffledQuestions = shuffle(
    questionBank.map((question) => ({
      question: question.question,
      options: question.options.slice(),
      answer: question.answer
    }))
  );

  // 從完整題庫隨機抽出五題。
  quizQuestions = shuffledQuestions.slice(0, QUESTIONS_PER_QUIZ);

  // 每一題的四個選項也各自重新隨機排列。
  quizQuestions = quizQuestions.map((question) => ({
    question: question.question,
    options: shuffle(question.options.slice()),
    answer: question.answer
  }));

  // 將測驗狀態重設為第一題、零分且尚未作答。
  currentQuestion = 0;
  correctCount = 0;
  hasAnswered = false;
  selectedOption = "";
  animationStartTime = 0;

  // 建立第一題的四個選項按鈕。
  createOptionButtons();
}

// 建立重新載入題庫按鈕。
function createReloadButton() {
  // 避免同一頁重複建立按鈕。
  if (reloadButton) {
    return;
  }

  // 建立 p5.js HTML 按鈕。
  reloadButton = createButton("重新載入題庫");

  // 套用操作按鈕共用樣式。
  styleActionButton(reloadButton, "#52796f");

  // 設定無障礙標籤，方便螢幕閱讀器辨識。
  reloadButton.elt.setAttribute("aria-label", "重新載入 Google Sheets 題庫");

  // 按下後重新 fetch Google Sheets，取得最新題目。
  reloadButton.mousePressed(loadQuestionBank);
}

// 依目前畫面大小定位重新載入按鈕。
function positionReloadButton() {
  // 若按鈕尚未建立就不進行定位。
  if (!reloadButton) {
    return;
  }

  // 讓載入中無法重複送出多個 fetch 請求。
  updateReloadButtonState();

  // 手機上使用較窄按鈕，桌面上則限制最大寬度。
  const buttonWidth = Math.min(Math.max(width * 0.28, 142), 190);
  const buttonHeight = Math.min(Math.max(Math.min(width, height) * 0.1, 42), 50);

  // 固定在左上角，且保留安全邊界。
  reloadButton.position(12, 12);
  reloadButton.size(buttonWidth, buttonHeight);
}

// 更新重新載入按鈕的啟用狀態。
function updateReloadButtonState() {
  // 尚未建立按鈕時略過。
  if (!reloadButton) {
    return;
  }

  // 使用原生 disabled 屬性避免載入期間重複請求。
  reloadButton.elt.disabled = isLoading;
  reloadButton.style("opacity", isLoading ? "0.65" : "1");
  reloadButton.style("cursor", isLoading ? "wait" : "pointer");
}

// 建立四個選項按鈕。
function createOptionButtons() {
  // 先移除舊的四個選項按鈕。
  clearOptionButtons();

  // 重新計算目前裝置適合的版面。
  calculateResponsiveLayout();

  // 取得目前題目。
  const current = quizQuestions[currentQuestion];

  // 依隨機後的順序建立四個按鈕。
  current.options.forEach((optionText, index) => {
    // 建立 HTML 選項按鈕。
    const button = createButton(optionText);

    // 套用選項按鈕樣式。
    styleOptionButton(button);

    // 計算水平置中與垂直排列位置。
    const buttonX = windowWidth / 2 - layoutInfo.optionWidth / 2;
    const buttonY = layoutInfo.optionTop +
      index * (layoutInfo.optionHeight + layoutInfo.optionGap);

    // 設定按鈕位置與尺寸。
    button.position(buttonX, buttonY);
    button.size(layoutInfo.optionWidth, layoutInfo.optionHeight);

    // 點擊選項後只允許判斷一次答案。
    button.mousePressed(() => answerQuestion(optionText));

    // 將按鈕保存到陣列，方便之後上色、動畫與重新定位。
    optionButtons.push(button);
  });
}

// 建立下一題或查看成績按鈕。
function createNextButton() {
  // 若已存在舊按鈕，先移除避免重複。
  if (nextButton) {
    nextButton.remove();
    nextButton = null;
  }

  // 最後一題使用「查看成績」，其他題使用「下一題」。
  const buttonText = currentQuestion === quizQuestions.length - 1
    ? "查看成績"
    : "下一題";

  // 建立操作按鈕。
  nextButton = createButton(buttonText);
  styleActionButton(nextButton, actionColor);

  // 重新計算版面並放在選項下方的控制區域。
  calculateResponsiveLayout();
  positionActionButton(nextButton);

  // 按下後前往下一題或結果畫面。
  nextButton.mousePressed(goToNextQuestion);
}

// 建立測驗完成後的重新開始按鈕。
function createRestartButton() {
  // 避免結果畫面重複建立按鈕。
  if (restartButton) {
    return;
  }

  // 建立重新開始按鈕。
  restartButton = createButton("重新開始");
  styleActionButton(restartButton, actionColor);

  // 結果畫面將按鈕放在畫面下方且水平置中。
  positionRestartButton();

  // 按下後重新抽五題，選項也會重新排列。
  restartButton.mousePressed(startQuiz);
}

// 判斷使用者答案並顯示正確、錯誤顏色。
function answerQuestion(optionText) {
  // 已經作答後禁止再次選擇。
  if (hasAnswered) {
    return;
  }

  // 記錄選項並鎖定目前題目。
  selectedOption = optionText;
  hasAnswered = true;
  animationStartTime = millis();

  // 取得目前題目的正確答案。
  const current = quizQuestions[currentQuestion];

  // 答案完全相同時增加一題正確數。
  if (optionText === current.answer) {
    correctCount += 1;
  }

  // 更新四個選項的顏色，並停用按鈕。
  updateOptionStyles();

  // 作答後顯示下一題按鈕。
  createNextButton();
}

// 將答對與答錯答案套用指定顏色，並顯示正確答案。
function updateOptionStyles() {
  // 取得目前題目資料。
  const current = quizQuestions[currentQuestion];

  // 逐一處理四個選項按鈕。
  optionButtons.forEach((button, index) => {
    // 取得該按鈕代表的選項文字。
    const optionText = current.options[index];

    // 停用按鈕，防止使用者重複作答。
    button.elt.disabled = true;
    button.style("cursor", "default");

    // 正確答案一定顯示藍色；答對時就是使用者選到的藍色選項。
    if (optionText === current.answer) {
      button.style("background-color", correctColor);
    }

    // 答錯時，將使用者選到的錯誤選項改為粉紅色。
    if (optionText === selectedOption && selectedOption !== current.answer) {
      button.style("background-color", wrongColor);
    }
  });
}

// 前往下一題，最後一題後會進入結果畫面。
function goToNextQuestion() {
  // 題號索引加一。
  currentQuestion += 1;

  // 清除上一題的作答與動畫狀態。
  hasAnswered = false;
  selectedOption = "";
  animationStartTime = 0;

  // 移除上一題的選項與下一題按鈕。
  clearQuizButtons();

  // 如果還有題目，建立下一題選項。
  if (currentQuestion < quizQuestions.length) {
    createOptionButtons();
  }
}

// 移除選項、下一題與重新開始按鈕，但保留重新載入題庫按鈕。
function clearQuizButtons() {
  // 移除四個選項按鈕。
  clearOptionButtons();

  // 移除下一題按鈕。
  if (nextButton) {
    nextButton.remove();
    nextButton = null;
  }

  // 移除重新開始按鈕。
  if (restartButton) {
    restartButton.remove();
    restartButton = null;
  }
}

// 只移除四個選項按鈕。
function clearOptionButtons() {
  // 逐一移除 HTML 按鈕。
  optionButtons.forEach((button) => button.remove());

  // 清空陣列。
  optionButtons = [];
}

// 重新定位目前畫面上的所有 HTML 按鈕。
function repositionAllButtons() {
  // 重新定位左上角的重新載入題庫按鈕。
  positionReloadButton();

  // 測驗畫面重新定位四個選項。
  if (currentQuestion < quizQuestions.length && quizQuestions.length > 0) {
    repositionOptionButtons();

    // 作答後重新定位下一題按鈕。
    if (nextButton) {
      positionActionButton(nextButton);
    }

    return;
  }

  // 結果畫面重新定位重新開始按鈕。
  if (restartButton) {
    positionRestartButton();
  }
}

// 重新定位並調整四個選項按鈕的尺寸。
function repositionOptionButtons() {
  // 重新計算版面資訊。
  calculateResponsiveLayout();

  // 逐一設定四個選項的位置與尺寸。
  optionButtons.forEach((button, index) => {
    const buttonX = windowWidth / 2 - layoutInfo.optionWidth / 2;
    const buttonY = layoutInfo.optionTop +
      index * (layoutInfo.optionHeight + layoutInfo.optionGap);

    button.position(buttonX, buttonY);
    button.size(layoutInfo.optionWidth, layoutInfo.optionHeight);
  });
}

// 定位下一題或查看成績按鈕。
function positionActionButton(button) {
  // 沒有按鈕時不進行操作。
  if (!button) {
    return;
  }

  // 依選項寬度設定適合手機與桌面的操作按鈕寬度。
  const buttonWidth = Math.min(Math.max(layoutInfo.optionWidth * 0.42, 150), 200);
  const buttonX = windowWidth / 2 - buttonWidth / 2;

  // 將按鈕放在畫面下方控制區域。
  button.position(buttonX, layoutInfo.actionY);
  button.size(buttonWidth, layoutInfo.actionHeight);
}

// 定位結果畫面的重新開始按鈕。
function positionRestartButton() {
  // 沒有按鈕時不進行操作。
  if (!restartButton) {
    return;
  }

  // 重新計算適合目前寬度的按鈕尺寸。
  const buttonWidth = Math.min(Math.max(layoutInfo.optionWidth * 0.42, 150), 200);
  const buttonX = windowWidth / 2 - buttonWidth / 2;

  // 在結果訊息下方放置重新開始按鈕。
  const buttonY = Math.min(height * 0.78, height - layoutInfo.actionHeight - 14);
  restartButton.position(buttonX, Math.max(buttonY, 12));
  restartButton.size(buttonWidth, layoutInfo.actionHeight);
}

// 套用選項按鈕的完整樣式。
function styleOptionButton(button) {
  // 設定按鈕字型、大小與文字顏色。
  button.style("font-family", `"${buttonFont}", monospace`);
  button.style("font-size", `${responsiveTextSize(0.043, 16, 25)}px`);
  button.style("color", "#ffffff");

  // 設定尚未作答時的綠色背景。
  button.style("background-color", optionColor);

  // 設定圓角、陰影與內距，保留原本的視覺風格。
  button.style("border", "none");
  button.style("border-radius", "14px");
  button.style("padding", "8px 16px");
  button.style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.18)");
  button.style("user-select", "none");
  button.style("cursor", "pointer");
}

// 套用下一題、重新開始、重新載入按鈕的共用樣式。
function styleActionButton(button, background) {
  // 設定按鈕字型與文字大小。
  button.style("font-family", `"${buttonFont}", monospace`);
  button.style("font-size", `${responsiveTextSize(0.043, 16, 25)}px`);
  button.style("color", "#ffffff");

  // 設定按鈕背景、圓角、陰影與觸控行為。
  button.style("background-color", background);
  button.style("border", "none");
  button.style("border-radius", "14px");
  button.style("padding", "8px 16px");
  button.style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.18)");
  button.style("user-select", "none");
  button.style("cursor", "pointer");
}

// ============================================================================
// 響應式版面與畫面繪製
// ============================================================================

// 以螢幕短邊計算介於最小值與最大值之間的文字大小。
function responsiveTextSize(ratio, minimum, maximum) {
  return Math.min(Math.max(Math.min(width, height) * ratio, minimum), maximum);
}

// 計算題目方框、選項與操作按鈕的響應式位置。
function calculateResponsiveLayout() {
  // 取得畫布尺寸與方向。
  const canvasWidth = width;
  const canvasHeight = height;
  const shortestSide = Math.min(canvasWidth, canvasHeight);
  const isLandscape = canvasWidth > canvasHeight;

  // 限制內容寬度，避免桌面超寬螢幕讓文字行距過長。
  const contentWidth = Math.min(canvasWidth * 0.9, 820);
  const questionWidth = Math.min(canvasWidth * 0.9, 760);
  const optionWidth = Math.min(canvasWidth * 0.9, 720);

  // 橫向畫面壓低高度；直向畫面給題目較充足的顯示空間。
  const questionTop = isLandscape
    ? Math.max(canvasHeight * 0.13, 54)
    : Math.max(canvasHeight * 0.145, 92);
  const questionHeight = isLandscape
    ? Math.min(Math.max(canvasHeight * 0.21, 82), 128)
    : Math.min(Math.max(canvasHeight * 0.19, 138), 180);

  // 依裝置短邊計算四個選項高度與間距。
  let optionHeight = isLandscape
    ? Math.min(Math.max(shortestSide * 0.105, 36), 54)
    : Math.min(Math.max(shortestSide * 0.085, 48), 64);
  let optionGap = Math.min(Math.max(shortestSide * 0.018, 7), 15);

  // 題目方框與選項之間保留視覺間隔。
  const optionTop = questionTop + questionHeight + (isLandscape ? 14 : 20);

  // 預留底部操作按鈕空間，避免橫向手機高度不足時重疊。
  const actionHeight = Math.min(Math.max(shortestSide * 0.1, 44), 56);
  const actionY = Math.max(canvasHeight - actionHeight - 14, optionTop);
  const reservedBottom = hasAnswered && !isLandscape ? 106 : 20;
  const availableOptionHeight = Math.max(
    4 * 32 + 3 * 6,
    canvasHeight - optionTop - reservedBottom
  );

  // 如果高度不足，將四個選項等比例縮小以維持完整顯示。
  const desiredGroupHeight = optionHeight * 4 + optionGap * 3;
  if (desiredGroupHeight > availableOptionHeight) {
    optionGap = Math.max(6, Math.min(optionGap, (availableOptionHeight - 4 * 32) / 3));
    optionHeight = Math.max(32, (availableOptionHeight - optionGap * 3) / 4);
  }

  // 計算選項群組底部位置。
  const optionGroupHeight = optionHeight * 4 + optionGap * 3;
  const optionEnd = optionTop + optionGroupHeight;

  // 只有有足夠高度的畫面才顯示提示文字；按鈕本身仍會正常顯示。
  const showHint = hasAnswered && !isLandscape && canvasHeight >= 500;
  const hintY = showHint ? Math.min(optionEnd + 24, actionY - 36) : 0;

  // 儲存所有版面資訊供繪圖與 HTML 按鈕共用。
  layoutInfo = {
    contentWidth: contentWidth,
    questionTop: questionTop,
    questionHeight: questionHeight,
    questionWidth: questionWidth,
    optionTop: optionTop,
    optionWidth: optionWidth,
    optionHeight: optionHeight,
    optionGap: optionGap,
    optionEnd: optionEnd,
    hintY: hintY,
    actionY: actionY,
    actionHeight: actionHeight,
    showHint: showHint
  };
}

// 繪製題庫載入中的畫面。
function drawLoadingScreen() {
  // 設定置中對齊、白色文字與響應式大小。
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(responsiveTextSize(0.06, 22, 38));

  // 顯示載入提示。
  text("正在載入 Google Sheets 題庫，請稍候……", 0, height * 0.46, layoutInfo.contentWidth, 80);
}

// 繪製題庫錯誤畫面。
function drawDataErrorScreen() {
  // 設定文字置中與白色文字。
  textAlign(CENTER, CENTER);
  fill(255);

  // 顯示錯誤標題。
  textSize(responsiveTextSize(0.07, 24, 42));
  text("題庫載入失敗", 0, height * 0.30);

  // 顯示實際錯誤內容，方便老師根據訊息修正網址或試算表。
  textSize(responsiveTextSize(0.038, 16, 24));
  text(loadErrorMessage || "請確認題庫至少有五題。", 0, height * 0.43, layoutInfo.contentWidth, 100);

  // 顯示 CSV 欄位要求與公開權限提醒。
  text(
    "欄位必須是 question, option1, option2, option3, option4, answer；\n" +
    "試算表也必須已發布到網路或可公開讀取。",
    0,
    height * 0.60,
    layoutInfo.contentWidth,
    120
  );
}

// 繪製作答畫面，包括題數、#415a77 題目方框與提示。
function drawQuizScreen() {
  // 取得目前題目資料。
  const current = quizQuestions[currentQuestion];

  // 設定所有畫布文字置中。
  textAlign(CENTER, CENTER);

  // 繪製目前題數。
  fill(255);
  textSize(responsiveTextSize(0.035, 18, 30));
  text(
    `第 ${currentQuestion + 1} 題／共 ${quizQuestions.length} 題`,
    0,
    isLandscapeLayout() ? height * 0.065 : height * 0.075
  );

  // 計算題目方框左側座標，使方框永遠位於畫布正中央。
  const questionX = -layoutInfo.questionWidth / 2;
  const questionPadding = Math.min(width * 0.04, 28);
  const questionRadius = Math.min(width * 0.025, 18);

  // 繪製 #415a77 題目背景方框。
  noStroke();
  fill(questionBoxColor);
  rect(
    questionX,
    layoutInfo.questionTop,
    layoutInfo.questionWidth,
    layoutInfo.questionHeight,
    questionRadius
  );

  // 在方框內置中顯示題目文字。
  fill(255);
  textSize(responsiveTextSize(0.06, 21, 38));
  text(
    current.question,
    questionX + questionPadding,
    layoutInfo.questionTop + questionPadding,
    layoutInfo.questionWidth - questionPadding * 2,
    layoutInfo.questionHeight - questionPadding * 2
  );

  // 作答後在選項下方顯示提示，短小橫向畫面則避免擁擠。
  if (layoutInfo.showHint) {
    fill(255);
    textSize(responsiveTextSize(0.038, 16, 24));
    text("請按下「下一題」繼續", 0, layoutInfo.hintY);
  }
}

// 繪製測驗完成後的成績畫面。
function drawResultScreen() {
  // 設定畫布文字置中。
  textAlign(CENTER, CENTER);
  fill(255);

  // 顯示完成標題。
  textSize(responsiveTextSize(0.085, 30, 56));
  text("測驗完成！", 0, height * 0.20);

  // 顯示答對題數。
  textSize(responsiveTextSize(0.06, 22, 40));
  text(`答對 ${correctCount} 題，共 ${quizQuestions.length} 題`, 0, height * 0.32);

  // 顯示每題 20 分計算出的總分。
  const score = correctCount * POINTS_PER_QUESTION;
  text(`總成績：${score} 分`, 0, height * 0.42);

  // 依照 60 分門檻顯示成功或加油訊息。
  textSize(responsiveTextSize(0.045, 18, 28));
  if (score >= 60) {
    text("太棒了！你已經掌握沉澱表！", 0, height * 0.54);
  } else {
    text("別灰心，再接再厲，你一定可以！", 0, height * 0.54);
  }
}

// ============================================================================
// 作答動畫與結果特效
// ============================================================================

// 讓正確答案上下跳動、答錯使用者選項左右移動。
function animateAnsweredOptions() {
  // 依時間產生平滑的週期性位移。
  const elapsed = millis() - animationStartTime;
  const wave = Math.sin(elapsed * 0.008);
  const current = quizQuestions[currentQuestion];

  // 逐一更新按鈕位置，不改變按鈕尺寸。
  optionButtons.forEach((button, index) => {
    const optionText = current.options[index];
    let buttonX = windowWidth / 2 - layoutInfo.optionWidth / 2;
    let buttonY = layoutInfo.optionTop +
      index * (layoutInfo.optionHeight + layoutInfo.optionGap);

    // 正確答案上下跳動。
    if (optionText === current.answer) {
      buttonY += wave * 8;
    }

    // 使用者答錯的選項左右移動。
    if (optionText === selectedOption && selectedOption !== current.answer) {
      buttonX += wave * 10;
    }

    // 套用動畫後的位置。
    button.position(buttonX, buttonY);
  });
}

// 重設結果畫面的煙火與加油特效狀態。
function resetResultEffects() {
  // 清空所有粒子，下一次結果畫面會重新建立。
  fireworks = [];
  encouragementParticles = [];
  resultEffectStartTime = 0;
}

// 根據最後成績初始化並繪製對應的結果特效。
function drawResultEffect() {
  // 第一次進入結果畫面時才建立粒子。
  if (resultEffectStartTime === 0) {
    resultEffectStartTime = millis();

    if (correctCount * POINTS_PER_QUESTION >= 60) {
      createFireworks();
    } else {
      createEncouragementParticles();
    }
  }

  // 60 分以上顯示煙火，未滿 60 分顯示加油特效。
  if (correctCount * POINTS_PER_QUESTION >= 60) {
    drawFireworks();
  } else {
    drawEncouragementParticles();
  }
}

// 建立多組彩色煙火粒子。
function createFireworks() {
  // 清除上一輪粒子。
  fireworks = [];

  // 在成績文字下方建立數組煙火。
  for (let group = 0; group < 6; group += 1) {
    const centerX = random(-width * 0.42, width * 0.42);
    const centerY = random(height * 0.60, height * 0.88);
    const particleCount = 36;

    // 每組粒子以放射狀向外散開。
    for (let index = 0; index < particleCount; index += 1) {
      const angle = TWO_PI * index / particleCount;
      const speed = random(1.5, 4.2);

      fireworks.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 255,
        size: random(2, 5),
        red: random(80, 255),
        green: random(80, 255),
        blue: random(80, 255)
      });
    }
  }
}

// 更新並繪製煙火粒子。
function drawFireworks() {
  // 煙火粒子不需要邊線。
  noStroke();

  // 逐一繪製與更新每顆粒子。
  fireworks.forEach((particle) => {
    fill(particle.red, particle.green, particle.blue, particle.alpha);
    circle(particle.x, particle.y, particle.size);

    // 更新位置並加入重力。
    particle.x += particle.vx;
    particle.vy += 0.035;
    particle.y += particle.vy;

    // 逐漸消失，形成煙火散去效果。
    particle.alpha -= 2.2;
    particle.vx *= 0.995;
  });
}

// 建立低分時的加油粒子。
function createEncouragementParticles() {
  // 清除上一輪粒子。
  encouragementParticles = [];

  // 建立會向上漂浮的暖色粒子。
  for (let index = 0; index < 28; index += 1) {
    encouragementParticles.push({
      x: random(-width * 0.4, width * 0.4),
      y: random(height * 0.64, height * 0.92),
      size: random(4, 9),
      speed: random(0.5, 1.5),
      angle: random(TWO_PI),
      red: random(180, 255),
      green: random(180, 255),
      blue: random(70, 160),
      alpha: random(120, 230)
    });
  }
}

// 更新並繪製低分加油粒子與鼓勵文字。
function drawEncouragementParticles() {
  // 加油粒子不需要邊線。
  noStroke();

  // 逐一更新粒子位置，超出上方後從下方重新出現。
  encouragementParticles.forEach((particle) => {
    fill(particle.red, particle.green, particle.blue, particle.alpha);
    circle(particle.x, particle.y, particle.size);

    particle.angle += 0.025;
    particle.x += Math.sin(particle.angle) * 0.8;
    particle.y -= particle.speed;

    if (particle.y < height * 0.56) {
      particle.y = height * 0.92;
      particle.x = random(-width * 0.4, width * 0.4);
    }
  });

  // 顯示會上下浮動的加油文字。
  textAlign(CENTER, CENTER);
  textSize(responsiveTextSize(0.05, 20, 32));
  fill(255, 245, 180);
  const bounce = Math.sin(millis() * 0.004) * 5;
  text("加油！再試一次！", 0, height * 0.69 + bounce);
}

// ============================================================================
// 小型版面工具
// ============================================================================

// 判斷目前畫面是否為橫向，用於繪製題數文字的微調。
function isLandscapeLayout() {
  return width > height;
}
