#!/bin/bash

###############################################################################
# 夜間タスク実行前チェックスクリプト
#
# 以下をチェック:
#   1. 環境変数の確認
#   2. メモリ空き容量
#   3. ディスク空き容量
#   4. VSCodeプロセス数
#   5. Node.jsプロセス数
#   6. caffeinate実行確認
#
# 使い方:
#   bash pre-flight-check.sh
#
# 終了コード:
#   0: すべてOK
#   1: 警告あり（継続は可能）
#   2: 致命的エラー（実行を中止すべき）
###############################################################################

echo "🚀 夜間タスク実行前チェック"
echo ""

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# チェック結果
HAS_ERROR=false
HAS_WARNING=false

# ヘルパー関数
print_ok() {
  echo -e "  ${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "  ${YELLOW}⚠️  $1${NC}"
  HAS_WARNING=true
}

print_error() {
  echo -e "  ${RED}❌ $1${NC}"
  HAS_ERROR=true
}

print_info() {
  echo -e "  ${BLUE}ℹ️  $1${NC}"
}

# =========================================================================
# 1. 環境変数チェック
# =========================================================================
echo "📋 ステップ1: 環境変数チェック"
echo ""

if [ -z "$AIRTABLE_API_KEY" ]; then
  print_error "AIRTABLE_API_KEY が未設定です（必須）"
else
  MASKED_KEY="${AIRTABLE_API_KEY:0:10}***"
  print_ok "AIRTABLE_API_KEY 設定済み ($MASKED_KEY)"
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  print_warning "ANTHROPIC_API_KEY 未設定（フェーズ2, 3で必要）"
else
  MASKED_KEY="${ANTHROPIC_API_KEY:0:10}***"
  print_ok "ANTHROPIC_API_KEY 設定済み ($MASKED_KEY)"
fi

echo ""

# =========================================================================
# 2. メモリ使用量チェック
# =========================================================================
echo "💾 ステップ2: メモリ使用量チェック"
echo ""

# macOSのメモリ情報取得
MEMORY_FREE_PAGES=$(vm_stat | awk '/free/ {print $3}' | sed 's/\.//')
MEMORY_FREE_MB=$((MEMORY_FREE_PAGES * 4096 / 1024 / 1024))

if [ $MEMORY_FREE_MB -lt 500 ]; then
  print_error "空きメモリが500MB未満です（${MEMORY_FREE_MB}MB）"
  print_info "不要なアプリを終了してください"
elif [ $MEMORY_FREE_MB -lt 1024 ]; then
  print_warning "空きメモリが1GB未満です（${MEMORY_FREE_MB}MB）"
  print_info "可能であれば不要なアプリを終了してください"
else
  print_ok "空きメモリ: ${MEMORY_FREE_MB}MB（十分です）"
fi

echo ""

# =========================================================================
# 3. ディスク空き容量チェック
# =========================================================================
echo "💿 ステップ3: ディスク空き容量チェック"
echo ""

DISK_FREE_GB=$(df -g . | awk 'NR==2 {print $4}')

if [ $DISK_FREE_GB -lt 2 ]; then
  print_error "ディスク空き容量が2GB未満です（${DISK_FREE_GB}GB）"
  print_info "不要なファイルを削除してください"
elif [ $DISK_FREE_GB -lt 5 ]; then
  print_warning "ディスク空き容量が5GB未満です（${DISK_FREE_GB}GB）"
else
  print_ok "ディスク空き容量: ${DISK_FREE_GB}GB（十分です）"
fi

echo ""

# =========================================================================
# 4. VSCodeプロセス数チェック
# =========================================================================
echo "🖥️  ステップ4: VSCodeプロセス数チェック"
echo ""

VSCODE_PROCESS_COUNT=$(ps aux | grep -i "Visual Studio Code" | grep -v grep | wc -l | tr -d ' ')

if [ $VSCODE_PROCESS_COUNT -gt 10 ]; then
  print_warning "VSCodeプロセス数が多いです（${VSCODE_PROCESS_COUNT}個）"
  print_info "VSCodeを再起動するか、閉じることを推奨します"
elif [ $VSCODE_PROCESS_COUNT -gt 0 ]; then
  print_info "VSCodeプロセス数: ${VSCODE_PROCESS_COUNT}個"
  print_info "長時間実行の場合、VSCodeを閉じることを推奨します"
else
  print_ok "VSCodeは起動していません（最も安全）"
fi

echo ""

# =========================================================================
# 5. Node.jsプロセス数チェック
# =========================================================================
echo "🟢 ステップ5: Node.jsプロセス数チェック"
echo ""

NODE_PROCESS_COUNT=$(ps aux | grep node | grep -v grep | wc -l | tr -d ' ')

if [ $NODE_PROCESS_COUNT -gt 15 ]; then
  print_warning "Node.jsプロセス数が多いです（${NODE_PROCESS_COUNT}個）"
  print_info "不要なNode.jsプロセスを終了してください"
  print_info "確認コマンド: ps aux | grep node"
else
  print_ok "Node.jsプロセス数: ${NODE_PROCESS_COUNT}個（正常）"
fi

echo ""

# =========================================================================
# 6. caffeinate実行確認
# =========================================================================
echo "☕ ステップ6: caffeinate実行確認"
echo ""

if pgrep -x "caffeinate" > /dev/null; then
  print_ok "caffeinate は既に実行中です"
else
  print_warning "caffeinate が実行されていません"
  print_info "スリープ防止のため、以下を実行してください:"
  print_info "  caffeinate -d &"
fi

echo ""

# =========================================================================
# 7. 推奨事項
# =========================================================================
echo "💡 ステップ7: 推奨事項"
echo ""

print_info "夜間長時間実行の推奨設定:"
echo ""
echo "    1. VSCodeを閉じる（メモリ節約、クラッシュリスク回避）"
echo "    2. tmuxセッションで実行（接続が切れても継続）"
echo "    3. caffeinate でスリープ防止（必須）"
echo "    4. nohup でバックグラウンド実行（オプション）"
echo ""

# =========================================================================
# 結果サマリー
# =========================================================================
echo "="$(printf '=%.0s' {1..60})
echo "📊 チェック結果サマリー"
echo "="$(printf '=%.0s' {1..60})
echo ""

if [ "$HAS_ERROR" = true ]; then
  echo -e "${RED}❌ 致命的エラーがあります${NC}"
  echo ""
  echo "上記のエラーを解決してから実行してください。"
  echo ""
  exit 2
elif [ "$HAS_WARNING" = true ]; then
  echo -e "${YELLOW}⚠️  警告がありますが、実行は可能です${NC}"
  echo ""
  echo "可能であれば警告を解決してから実行することを推奨します。"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ すべてのチェックをパスしました！${NC}"
  echo ""
  echo "夜間タスクを実行する準備が整いました。"
  echo ""
  exit 0
fi
