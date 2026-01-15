/**
 * GA4イベントトラッキング - サイト間ファネル分析用
 *
 * このスクリプトは以下のイベントを自動的にトラッキングします：
 * 1. サイト間リンククリック（keiba-matome ⇄ chihou-keiba-matome ⇄ yosou-keiba-matome）
 * 2. nankan-analyticsへのリンククリック（最終ゴール）
 * 3. コメント内のリンククリック
 */

(function() {
  'use strict';

  // GA4が読み込まれているか確認
  if (typeof gtag === 'undefined') {
    console.warn('GA4 (gtag) is not loaded. Events will not be tracked.');
    return;
  }

  /**
   * イベント送信ヘルパー
   */
  function sendEvent(eventName, params) {
    try {
      gtag('event', eventName, params);
      console.log('[GA4 Event]', eventName, params);
    } catch (error) {
      console.error('[GA4 Error]', error);
    }
  }

  /**
   * サイト間リンクの判定
   */
  function getSiteType(url) {
    if (url.includes('keiba-matome.jp') && !url.includes('chihou') && !url.includes('yosou')) {
      return 'keiba-matome';
    }
    if (url.includes('chihou.keiba-matome.jp')) {
      return 'chihou-keiba-matome';
    }
    if (url.includes('yosou.keiba-matome.jp')) {
      return 'yosou-keiba-matome';
    }
    if (url.includes('nankan-analytics.com')) {
      return 'nankan-analytics';
    }
    return null;
  }

  /**
   * 現在のサイトを判定
   */
  function getCurrentSite() {
    const hostname = window.location.hostname;
    if (hostname.includes('chihou')) return 'chihou-keiba-matome';
    if (hostname.includes('yosou')) return 'yosou-keiba-matome';
    if (hostname.includes('keiba-matome')) return 'keiba-matome';
    return 'unknown';
  }

  /**
   * リンククリックイベントのトラッキング
   */
  function trackLinkClick(event) {
    const link = event.target.closest('a');
    if (!link || !link.href) return;

    const url = link.href;
    const targetSite = getSiteType(url);
    const currentSite = getCurrentSite();

    // 外部リンクの場合
    if (link.hostname !== window.location.hostname) {

      // nankan-analyticsへのリンク（最終ゴール）
      if (targetSite === 'nankan-analytics') {
        sendEvent('nankan_analytics_click', {
          from_site: currentSite,
          link_url: url,
          link_text: link.textContent.substring(0, 100),
          link_location: getLinkLocation(link),
        });
      }

      // サイト間リンク（ファネル遷移）
      else if (targetSite) {
        sendEvent('site_transition', {
          from_site: currentSite,
          to_site: targetSite,
          link_url: url,
          link_text: link.textContent.substring(0, 100),
          link_location: getLinkLocation(link),
        });
      }

      // その他の外部リンク
      else {
        sendEvent('external_link_click', {
          from_site: currentSite,
          link_url: url,
          link_text: link.textContent.substring(0, 100),
        });
      }
    }
  }

  /**
   * リンクの位置を判定（どこからクリックされたか）
   */
  function getLinkLocation(link) {
    // コメント内のリンク
    if (link.closest('.comment-content, .comment-body, .comment-text')) {
      return 'comment';
    }
    // サイドバー
    if (link.closest('aside, .sidebar')) {
      return 'sidebar';
    }
    // ヘッダー
    if (link.closest('header, .header')) {
      return 'header';
    }
    // フッター
    if (link.closest('footer, .footer')) {
      return 'footer';
    }
    // 記事内
    if (link.closest('article, .article, .news-content')) {
      return 'article';
    }
    // CTA
    if (link.closest('.cta, .call-to-action')) {
      return 'cta';
    }
    return 'other';
  }

  /**
   * ページビュー拡張トラッキング
   */
  function trackPageView() {
    const currentSite = getCurrentSite();
    const pageType = getPageType();

    sendEvent('page_view_enhanced', {
      site: currentSite,
      page_type: pageType,
      page_path: window.location.pathname,
    });
  }

  /**
   * ページタイプを判定
   */
  function getPageType() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'top';
    if (path.includes('/news/')) return 'article';
    if (path.includes('/sites/')) return 'site_detail';
    return 'other';
  }

  /**
   * 初期化
   */
  function init() {
    // リンククリックイベントをキャプチャ（全てのリンクに自動適用）
    document.addEventListener('click', trackLinkClick, true);

    // ページビュートラッキング
    trackPageView();

    console.log('[GA4 Tracking] Initialized for', getCurrentSite());
  }

  // DOMContentLoaded後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
