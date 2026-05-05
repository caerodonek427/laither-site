# laither-site Hugo 静态站 + nginx serve
#
# 主用途: CF Pages 是主部署, 本 Dockerfile 是家里 fallback
# 家里联想跑法:
#   docker compose up -d laither-site
#   浏览器 http://localhost:8080/
#   fallback 场景: CF 挂时通过 CF Tunnel 或直接 IP 访问家里版本

# =========================================
# Stage 1: Hugo 构建
# =========================================
FROM hugomods/hugo:0.161.1 AS builder

WORKDIR /site

# 复制源码 (包括 theme git submodule 目录里的实际文件)
COPY . .

# 确保 submodule 内容就位
# 如果 clone 时没带 --recurse-submodules, 这里会缺 theme
# Dockerfile 假设 submodule 已就位 (git clone --recurse 或 git submodule update --init)
RUN hugo --minify --environment production

# =========================================
# Stage 2: nginx 静态服务
# =========================================
FROM nginx:alpine AS runtime

# 清除默认站
RUN rm -rf /usr/share/nginx/html/*

# 复制构建产物
COPY --from=builder /site/public /usr/share/nginx/html

# 自定义 nginx config (开 gzip + cache header)
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA-style fallback for Hugo
    location / {
        try_files $uri $uri/ $uri.html /index.html;
    }

    # 静态资源长缓存
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # HTML 短缓存
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # 健康检查
    location = /health {
        access_log off;
        return 200 "ok\n";
    }
}
EOF

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
