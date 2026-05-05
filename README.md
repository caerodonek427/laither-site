# laither.com

王磊个人站点 · Laither 叠时工作室主站

## 技术栈

- [Hugo](https://gohugo.io) Extended 0.161+
- 主题：[hello-friend-ng](https://github.com/rhazdon/hugo-theme-hello-friend-ng)（极客暗主题）
- 部署：Cloudflare Pages

## 本地预览

```bash
hugo server -D
# 浏览器打开 http://localhost:1313
```

## 新增博文

```bash
hugo new content posts/my-post.md
```

## 构建

```bash
hugo --minify
# 输出到 public/
```

## 部署到 CF Pages

1. GitHub 仓库 push 后 CF Pages 自动构建
2. Framework preset: **Hugo**
3. Build command: `hugo --minify`
4. Build output: `public`
5. Environment variables:
   - `HUGO_VERSION = 0.161.1`
   - `HUGO_ENV = production`

**注意**：主题是 git submodule，CF Pages 会自动拉 submodule。

## Clone 时

```bash
git clone --recurse-submodules <repo-url>
# 或 clone 后
git submodule update --init --recursive
```

## 子站点规划

| 子域 | 路径 | 说明 |
|---|---|---|
| laither.com | 本仓库 | 主站 + 博客 + 作品 |
| memory.laither.com | Quartz 4 | memory 全量归档(私有) |
| vault.laither.com | Cryptomator+Caddy | 证件/文件(私有) |
| stock.laither.com | Streamlit | stock_quant SaaS |
| math.laither.com | Streamlit | math_exam_coach |
| brand.laither.com | Hugo 独立 | 品牌识别(logo/经营范围) |

详见 `C:/tmp/digital_assets_inventory.md`

## 备选主题目录（本地保留）

- `D:/laither-site-papermod-backup/` — PaperMod 原版
- `D:/laither-site-blowfish/` — Blowfish
- `D:/laither-site-stack/` — hugo-theme-stack

如果想换回，把当前 `D:/laither-site/` 改名备份，把候选改名为 `laither-site` 即可。
