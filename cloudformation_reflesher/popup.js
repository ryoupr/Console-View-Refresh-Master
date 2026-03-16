document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleRefresh');
  const intervalInput = document.getElementById('interval');
  const statusDiv = document.getElementById('status');

  function showError(message) {
    console.error(message);
    statusDiv.className = 'status error';
    statusDiv.textContent = `エラー: ${message}`;
    toggleButton.disabled = true;
    toggleButton.textContent = 'エラー';
  }

  function updateUI(state) {
    if (!state) {
      showError('状態情報の取得に失敗しました');
      return;
    }
    const { isRunning, interval } = state;
    toggleButton.textContent = isRunning ? '停止' : '開始';
    statusDiv.className = `status ${isRunning ? 'running' : 'stopped'}`;
    statusDiv.textContent = isRunning ? '実行中' : '停止中';
    intervalInput.value = interval / 1000;
    toggleButton.disabled = false;
  }

  async function getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('アクティブなタブが見つかりません');
      }
      if (!tab.url || !tab.url.includes('console.aws.amazon.com')) {
        throw new Error('このページでは利用できません');
      }
      return tab;
    } catch (error) {
      showError(error.message || 'タブの取得またはURLの検証に失敗しました');
      throw error;
    }
  }

  async function checkConnectionAndGetStatus(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'getStatus' });
      if (response && response.status === 'statusUpdate') {
        return { isRunning: response.isRunning, interval: response.interval };
      } else {
        throw new Error('無効な応答を受信しました');
      }
    } catch (error) {
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        return { isRunning: false, interval: 3000 };
      } catch (pingError) {
        throw new Error('content.jsとの接続に失敗しました。ページを再読み込みしてください。');
      }
    }
  }

  async function toggleRefresh() {
    toggleButton.disabled = true;

    try {
      const tab = await getCurrentTab();

      const intervalSeconds = parseInt(intervalInput.value);
      if (isNaN(intervalSeconds) || intervalSeconds < 1) {
        showError('更新間隔は1以上の数値を入力してください');
        const currentState = await checkConnectionAndGetStatus(tab.id);
        updateUI(currentState);
        return;
      }
      const intervalMs = intervalSeconds * 1000;

      const currentAction = toggleButton.textContent === '開始' ? 'start' : 'stop';

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: currentAction,
        interval: intervalMs
      });

      if (response && (response.status === 'started' || response.status === 'stopped')) {
        const newState = await checkConnectionAndGetStatus(tab.id);
        updateUI(newState);
      } else {
        throw new Error('content.jsから無効な応答がありました');
      }

    } catch (error) {
      showError(error.message || '更新処理でエラーが発生しました');
      try {
        const tab = await getCurrentTab();
        const currentState = await checkConnectionAndGetStatus(tab.id);
        updateUI(currentState);
      } catch (statusError) {
        // 状態取得も失敗した場合は何もしない
      }
    } finally {
      if (statusDiv.className.includes('error')) {
        toggleButton.disabled = true;
      } else {
        toggleButton.disabled = false;
      }
    }
  }

  async function initializePopup() {
    try {
      const tab = await getCurrentTab();
      const initialState = await checkConnectionAndGetStatus(tab.id);
      updateUI(initialState);
    } catch (error) {
      // getCurrentTab や checkConnectionAndGetStatus 内で showError が呼ばれる
    }
  }

  toggleButton.addEventListener('click', toggleRefresh);
  initializePopup();
});
