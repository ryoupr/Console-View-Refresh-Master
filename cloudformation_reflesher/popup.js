document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleRefresh');
  const intervalInput = document.getElementById('interval');
  const statusDiv = document.getElementById('status');

  // デバッグログ出力
  function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data || '');
  }

  // エラーログ出力とUI更新
  function showError(message) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error: ${message}`);
    statusDiv.className = 'status error'; // エラー用のスタイルクラスを追加（CSSも後で調整推奨）
    statusDiv.textContent = `エラー: ${message}`;
    // エラー時はボタンを無効化するなど、状態を明確にする
    toggleButton.disabled = true;
    toggleButton.textContent = 'エラー';
  }

  // UIを更新する関数
  function updateUI(state) {
    debugLog('UIを更新:', state);
    if (!state) {
      showError('状態情報の取得に失敗しました');
      return;
    }
    const { isRunning, interval } = state;
    toggleButton.textContent = isRunning ? '停止' : '開始';
    statusDiv.className = `status ${isRunning ? 'running' : 'stopped'}`;
    statusDiv.textContent = isRunning ? '実行中' : '停止中';
    intervalInput.value = interval / 1000; // msから秒に変換
    toggleButton.disabled = false; // エラーでなければボタンを有効化
  }

  // 現在のタブを取得
  async function getCurrentTab() {
    try {
      debugLog('現在のタブを取得中...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('アクティブなタブが見つかりません');
      }
      // URLチェックを追加
      if (!tab.url || !tab.url.includes('console.aws.amazon.com')) {
        throw new Error('このページでは利用できません');
      }
      debugLog('タブ情報:', tab);
      return tab;
    } catch (error) {
      showError(error.message || 'タブの取得またはURLの検証に失敗しました');
      throw error; // エラーを再スローして呼び出し元で捕捉
    }
  }

  // content.jsとの接続を確認し、状態を取得
  async function checkConnectionAndGetStatus(tabId) {
    debugLog('content.jsとの接続確認と状態取得を開始...');
    try {
      // まず 'getStatus' を試みる (接続確認も兼ねる)
      const response = await chrome.tabs.sendMessage(tabId, { action: 'getStatus' });
      debugLog('状態を取得:', response);
      if (response && response.status === 'statusUpdate') {
        return { isRunning: response.isRunning, interval: response.interval };
      } else {
        throw new Error('無効な応答を受信しました');
      }
    } catch (error) {
      debugLog('getStatusに失敗、pingを試行:', error);
      // getStatusが失敗した場合、content scriptが古いか未注入の可能性があるためpingを試す
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        debugLog('ping成功、デフォルト状態でUIを初期化');
        // pingは成功したが状態は不明なため、デフォルト停止状態を返す
        return { isRunning: false, interval: 3000 };
      } catch (pingError) {
        debugLog('pingも失敗:', pingError);
        throw new Error('content.jsとの接続に失敗しました。ページを再読み込みしてください。');
      }
    }
  }

  // 更新状態の切り替え
  async function toggleRefresh() {
    debugLog('更新状態の切り替えを開始...');
    toggleButton.disabled = true; // 処理中はボタンを無効化

    try {
      const tab = await getCurrentTab(); // URL検証もここで行われる

      // 入力値の検証
      const intervalSeconds = parseInt(intervalInput.value);
      if (isNaN(intervalSeconds) || intervalSeconds < 1) {
        showError('更新間隔は1以上の数値を入力してください');
        // 状態取得してUIを元に戻す
        const currentState = await checkConnectionAndGetStatus(tab.id);
        updateUI(currentState);
        return;
      }
      const intervalMs = intervalSeconds * 1000;
      debugLog(`更新間隔を設定: ${intervalMs}ms`);

      // 現在のボタンのテキストに基づいてアクションを決定
      const currentAction = toggleButton.textContent === '開始' ? 'start' : 'stop';
      debugLog(`実行アクション: ${currentAction}`);

      // content.jsへメッセージ送信
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: currentAction,
        interval: intervalMs // startの場合のみ意味を持つが、常に送る
      });
      debugLog('メッセージ応答を受信:', response);

      // 応答に基づいてUIを更新
      if (response && (response.status === 'started' || response.status === 'stopped')) {
         // 再度状態を取得してUIに反映するのが最も確実
         const newState = await checkConnectionAndGetStatus(tab.id);
         updateUI(newState);
      } else {
        throw new Error('content.jsから無効な応答がありました');
      }

    } catch (error) {
      showError(error.message || '更新処理でエラーが発生しました');
      // エラー発生時も状態を再取得してUIを更新しようと試みる
      try {
        const tab = await getCurrentTab();
        const currentState = await checkConnectionAndGetStatus(tab.id);
        updateUI(currentState);
      } catch (statusError) {
        // 状態取得も失敗した場合はどうしようもない
        debugLog('エラー後の状態取得にも失敗:', statusError);
      }
    } finally {
       // 成功・失敗に関わらず、最終的にボタンの状態を更新
       if (statusDiv.className.includes('error')) {
           toggleButton.disabled = true;
       } else {
           toggleButton.disabled = false;
       }
    }
  }

  // 初期化処理
  async function initializePopup() {
    try {
      const tab = await getCurrentTab(); // URL検証もここで行われる
      const initialState = await checkConnectionAndGetStatus(tab.id);
      updateUI(initialState);
    } catch (error) {
      // getCurrentTabやcheckConnectionAndGetStatus内でshowErrorが呼ばれるはず
      debugLog('初期化中にエラーが発生:', error);
    }
  }

  // ボタンクリックイベントの設定
  toggleButton.addEventListener('click', toggleRefresh);

  // ポップアップ表示時に初期化処理を実行
  initializePopup();
});
