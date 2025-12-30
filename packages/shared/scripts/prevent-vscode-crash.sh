#!/bin/bash

###############################################################################
# VSCodeクラッシュ対策スクリプト
#
# 夜間長時間タスク実行時にVSCodeの予期せぬ終了を防ぐための対策
#
# 使い方:
#   bash packages/shared/scripts/prevent-vscode-crash.sh
#
# 実行タイミング:
#   夜間タスク実行前に必ず実行
###############################################################################

echo "🛡️  VSCodeクラッシュ対策を実施中..."
echo ""

# 1. VSCodeの自動保存を有効化（既に設定済みの場合はスキップ）
echo "✅ ステップ1: VSCode自動保存設定を確認"
VSCODE_SETTINGS="$HOME/Library/Application Support/Code/User/settings.json"

if [ -f "$VSCODE_SETTINGS" ]; then
  if grep -q '"files.autoSave"' "$VSCODE_SETTINGS"; then
    echo "   既に自動保存が設定されています"
  else
    echo "   自動保存設定がありません（手動で設定してください）"
    echo "   推奨設定: VSCode → Settings → Files: Auto Save → afterDelay"
  fi
else
  echo "   VSCode設定ファイルが見つかりません"
fi
echo ""

# 2. メモリ使用量をチェック
echo "✅ ステップ2: メモリ使用量チェック"
MEMORY_USAGE=$(vm_stat | awk '/free/ {print $3}' | sed 's/\.//')
MEMORY_FREE_MB=$((MEMORY_USAGE * 4096 / 1024 / 1024))

if [ $MEMORY_FREE_MB -lt 1024 ]; then
  echo "   ⚠️  空きメモリが1GB未満です（${MEMORY_FREE_MB}MB）"
  echo "   推奨: 不要なアプリを終了してください"
else
  echo "   空きメモリ: ${MEMORY_FREE_MB}MB（十分です）"
fi
echo ""

# 3. VSCodeのプロセス数をチェック
echo "✅ ステップ3: VSCodeプロセス数チェック"
VSCODE_PROCESS_COUNT=$(ps aux | grep -i "Visual Studio Code" | grep -v grep | wc -l | tr -d ' ')

if [ $VSCODE_PROCESS_COUNT -gt 5 ]; then
  echo "   ⚠️  VSCodeのプロセス数が多いです（${VSCODE_PROCESS_COUNT}個）"
  echo "   推奨: VSCodeを再起動してください"
else
  echo "   VSCodeプロセス数: ${VSCODE_PROCESS_COUNT}個（正常）"
fi
echo ""

# 4. Node.jsプロセス数をチェック
echo "✅ ステップ4: Node.jsプロセス数チェック"
NODE_PROCESS_COUNT=$(ps aux | grep node | grep -v grep | wc -l | tr -d ' ')

if [ $NODE_PROCESS_COUNT -gt 10 ]; then
  echo "   ⚠️  Node.jsプロセス数が多いです（${NODE_PROCESS_COUNT}個）"
  echo "   推奨: 不要なNode.jsプロセスを終了してください"
  echo "   確認コマンド: ps aux | grep node"
else
  echo "   Node.jsプロセス数: ${NODE_PROCESS_COUNT}個（正常）"
fi
echo ""

# 5. ディスク空き容量をチェック
echo "✅ ステップ5: ディスク空き容量チェック"
DISK_FREE_GB=$(df -g . | awk 'NR==2 {print $4}')

if [ $DISK_FREE_GB -lt 5 ]; then
  echo "   ⚠️  ディスク空き容量が5GB未満です（${DISK_FREE_GB}GB）"
  echo "   推奨: 不要なファイルを削除してください"
else
  echo "   ディスク空き容量: ${DISK_FREE_GB}GB（十分です）"
fi
echo ""

# 6. VSCode拡張機能の無効化推奨リスト
echo "✅ ステップ6: VSCode拡張機能の最適化推奨"
echo "   夜間長時間実行時は、以下の拡張機能を一時無効化することを推奨:"
echo "   - Copilot（大量のAPI呼び出しでメモリ使用量増加）"
echo "   - ESLint（大規模プロジェクトでCPU使用率上昇）"
echo "   - Prettier（自動フォーマットでディスクI/O増加）"
echo "   - Git Graph（大規模リポジトリでメモリリーク）"
echo ""

# 7. バックグラウンドタスクの推奨設定
echo "✅ ステップ7: バックグラウンドタスク推奨設定"
echo "   以下の設定を推奨:"
echo "   1. VSCodeを閉じて、ターミナルのみで実行"
echo "   2. tmuxまたはscreenでセッションを作成（接続が切れても継続）"
echo "   3. nohupコマンドでバックグラウンド実行"
echo ""

# 8. クラッシュ時の自動復旧スクリプト生成
echo "✅ ステップ8: クラッシュ時の自動復旧スクリプト作成"

cat > /tmp/vscode-recovery.sh << 'EOF'
#!/bin/bash
# VSCodeクラッシュ時の自動復旧スクリプト

while true; do
  # VSCodeが起動しているかチェック
  if ! pgrep -f "Visual Studio Code" > /dev/null; then
    echo "[$(date)] VSCodeが停止していることを検知しました"

    # 自動保存ファイルの確認
    AUTOSAVE_DIR="$HOME/Library/Application Support/Code/Backups"
    if [ -d "$AUTOSAVE_DIR" ]; then
      echo "[$(date)] 自動保存ファイルが見つかりました: $AUTOSAVE_DIR"
    fi

    # VSCodeを再起動（オプション）
    # open -a "Visual Studio Code"
    # echo "[$(date)] VSCodeを再起動しました"
  fi

  # 60秒ごとにチェック
  sleep 60
done
EOF

chmod +x /tmp/vscode-recovery.sh
echo "   クラッシュ監視スクリプト作成: /tmp/vscode-recovery.sh"
echo "   バックグラウンドで実行する場合:"
echo "   $ nohup bash /tmp/vscode-recovery.sh > /tmp/vscode-recovery.log 2>&1 &"
echo ""

# 9. 推奨実行方法の表示
echo "="$(echo "=" | sed 's/.*/&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&/')"
echo "💡 推奨実行方法（クラッシュリスク最小化）"
echo "="$(echo "=" | sed 's/.*/&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&/')"
echo ""
echo "方法1: VSCodeを閉じて、ターミナルのみで実行"
echo "  $ cd /path/to/keiba-matome-monorepo"
echo "  $ caffeinate -d &"
echo "  $ bash NIGHTRUN-FULL.sh > nightrun.log 2>&1 &"
echo "  $ tail -f nightrun.log  # ログ監視"
echo ""
echo "方法2: tmuxセッションで実行（推奨）"
echo "  $ brew install tmux  # 初回のみ"
echo "  $ tmux new -s nightrun"
echo "  $ cd /path/to/keiba-matome-monorepo"
echo "  $ caffeinate -d &"
echo "  $ bash NIGHTRUN-FULL.sh"
echo "  # Ctrl+b → d でデタッチ（セッションは継続）"
echo "  # 翌朝: tmux attach -t nightrun  # セッション再接続"
echo ""
echo "方法3: nohupでバックグラウンド実行"
echo "  $ cd /path/to/keiba-matome-monorepo"
echo "  $ caffeinate -d &"
echo "  $ nohup bash NIGHTRUN-FULL.sh > nightrun.log 2>&1 &"
echo "  $ tail -f nightrun.log  # ログ監視"
echo ""
echo "="$(echo "=" | sed 's/.*/&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&/')"
echo ""

echo "✅ VSCodeクラッシュ対策完了！"
echo ""
echo "次のステップ:"
echo "  1. 上記の推奨設定を確認"
echo "  2. メモリ・ディスク空き容量が十分か確認"
echo "  3. VSCodeを閉じて、ターミナルで実行することを推奨"
echo "  4. NIGHTRUN.mdの手順に従って夜間タスクを実行"
echo ""
