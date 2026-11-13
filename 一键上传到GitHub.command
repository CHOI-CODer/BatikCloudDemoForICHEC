#!/bin/zsh
set -eu
cd "${0:A:h}"

publish_exit=0
if command -v node >/dev/null 2>&1; then
  node tools/publish-github.cjs "$@" || publish_exit=$?
else
  print '此源码发布工具需要本机的 Node.js。网页访客无需安装。'
  publish_exit=1
fi

if [[ -t 0 && "${1:-}" != '--check' ]]; then
  print ''
  read -r 'publish_reply?按回车关闭窗口。'
fi
exit "$publish_exit"
