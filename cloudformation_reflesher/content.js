let refreshInterval = null;
let currentInterval = 3000;
let isRunning = false;

function findRefreshButtons() {
  try {
    return Array.from(document.querySelectorAll('button[data-testid="refresh-button"]'));
  } catch (error) {
    console.error('更新ボタンの検索中にエラーが発生しました', error);
    return [];
  }
}

function performRefresh() {
  try {
    const refreshButtons = findRefreshButtons();
    if (refreshButtons.length > 0) {
      refreshButtons.forEach((button) => {
        try {
          button.click();
        } catch (error) {
          console.error('ボタンのクリックに失敗しました', error);
        }
      });
    } else {
      console.error('更新ボタンが見つかりませんでした');
    }
  } catch (error) {
    console.error('更新処理でエラーが発生しました', error);
  }
}

function startAutoRefresh(interval) {
  const validInterval = (typeof interval === 'number' && interval >= 1000) ? interval : 3000;
  currentInterval = validInterval;

  try {
    stopAutoRefresh();
    refreshInterval = setInterval(performRefresh, currentInterval);
    isRunning = true;
  } catch (error) {
    console.error('自動更新の開始に失敗しました', error);
  }
}

function stopAutoRefresh() {
  try {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
    isRunning = false;
  } catch (error) {
    console.error('自動更新の停止に失敗しました', error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'ping':
        sendResponse({ status: 'ok' });
        break;
      case 'start':
        startAutoRefresh(message.interval);
        sendResponse({ status: 'started', interval: currentInterval });
        break;
      case 'stop':
        stopAutoRefresh();
        sendResponse({ status: 'stopped' });
        break;
      case 'getStatus':
        sendResponse({
          status: 'statusUpdate',
          isRunning: isRunning,
          interval: currentInterval
        });
        break;
      default:
        sendResponse({ status: 'error', message: 'Unknown action' });
        break;
    }
  } catch (error) {
    sendResponse({ status: 'error', message: error.message });
  }

  return true;
});
