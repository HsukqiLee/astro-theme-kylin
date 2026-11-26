# 清北博客 · Astro + Directus

Typecho Kylin 主题的 Astro 重构。前台采用 Astro 7 的 Node SSR，Directus 12.6 管理文章、独立页面、分类、标签和评论。

## 本机入口

- 博客：http://127.0.0.1:4433/
- 后台：http://127.0.0.1:8055/admin/
- 订阅：http://127.0.0.1:4433/rss.xml

管理员账号和已更新的密码保存在 `directus/runtime.env` 的 `ADMIN_EMAIL`、`ADMIN_PASSWORD` 中。网站服务账号使用 `.env` 中的 `DIRECTUS_TOKEN`。两个文件都已加入忽略列表；Docker 构建不会复制它们。

## 启动与更新

在本目录运行：

```sh
docker compose -f directus/compose.yml up -d --wait
docker compose up -d --build --wait
```

后台使用现有的 `directus-data`、`directus-uploads` 和 `directus-extensions` Docker 数据卷。缓存有效期为一分钟，内容写入后自动清除缓存。

本机开发需要 Node.js 22.23.4 或更新版本：

```sh
npm ci
npm run dev
```

开发模式和 Docker 前台都使用 4433 端口，切换到开发模式前执行 `docker compose stop web`。独立 Node 运行方式为 `npm run build` 后 `npm start`。

## 内容管理

在 Directus 后台的 `posts` 中编辑：

- `type=post`：文章，对应 `/archives/{slug}/`。
- `type=page`：独立页面，对应 `/{slug}/`；关于、专栏、友链沿用原有页面内容。
- `status=draft`：草稿；`status=published`：公开。
- `category`：文章卡片和面包屑显示的主分类。
- `categories`：多分类关系，决定分类页归属；需要同时选择主分类对应的条目。
- `tags`：多标签关系。
- `published_at`：发布时间；`date_updated` 在编辑时自动更新。
- `thumbnail`：图片 URL；媒体地址沿用现有 CDN。

新评论进入 `comments` 后状态为 `pending`，在后台改为 `approved` 后公开。网站会验证邮箱、网址、文章发布状态及回复归属。评论内容按纯文本展示；邮箱用于服务器生成头像摘要，不写入页面 HTML。

Markdown 支持代码块行号、脚注、目录、TeX SVG、旧 `[block]` / `[ruby]` 短代码及 `:::tip` 等容器。导航、主题开关、侧栏和打赏配置位于 `src/lib/config.ts`。

旧的 `/{slug}.html` 地址会永久跳转到 `/{slug}/`；正文里的本站链接使用相对地址。随机头像入口 `/user/avatar/` 已迁移，继续使用原站的 103 张 CDN 头像。

## 网站访问权限

Directus 12.6 当前许可不支持自定义条件和字段权限。本项目关闭博客集合的匿名 API 访问，由 Astro 服务端使用 `Kylin Website` 专用账号读取数据。

专用账号只拥有六个博客集合的读取权限，以及评论创建权限；没有文章修改、删除或后台管理权限。发布状态筛选、评论审核状态和提交字段由 Astro 页面及 API 控制。服务 Token 不传给浏览器。

需要重新生成服务账号 Token 或恢复后台 schema 时：

```sh
npm run setup:directus
docker compose up -d --force-recreate web
```

初始化脚本会备份原权限、配置服务账号、关闭匿名访问、补全时间字段，并导出 `directus/schema.snapshot.json`。如果是空后台，会先应用该 schema；schema 不包含文章或评论内容。

## 验证

```sh
npm run check
npm run build
npm test
npm audit --registry=https://registry.npmjs.org
```

浏览器测试使用本机 Microsoft Edge，需要 `.env` 和 `directus/runtime.env`。测试会优先使用已运行的 4433 服务，否则自动启动构建后的 Node 服务。

测试覆盖旧评论回复、后台发布、草稿隐藏、三层分类、多分类去重计数、标签计数、Markdown 和公式、评论审核、邮箱隐藏、跨文章回复拒绝、匿名权限、页面切换及手机搜索。迁移检查逐个访问所有已发布文章、独立页面、分类和标签路径，并核对评论关联。

发布测试只创建临时内容，结束时删除。JSON 报告和浏览器截图保存在 `test-results/`。

## 备份与服务器部署

本次调整前的完整后台备份：`directus/backups/directus-pre-cache.tgz`，包含数据库、上传文件和扩展。原权限另有 JSON 备份。备份文件包含私人数据，不提交到代码仓库。

服务器迁移时，先创建上述三个同名数据卷，在 Directus 停止状态下分别恢复归档中的 `database/`、`uploads/`、`extensions/`，再放置 `directus/runtime.env` 和 `.env`。目录所有权需与 Directus 镜像中的运行用户一致。

`.env` 的 `SITE_URL` 默认是 `https://blog.tsinbei.com`，用于 RSS 和 canonical URL；变更后重新构建前台。前台和后台只绑定本机端口，正式域名反向代理示例在 `Caddyfile.example`。

## 正式环境（已部署）

服务器：`ssh root@sapiens-lxq`。部署目录：`/www/wwwroot/blog`，实际指向 `/data/wwwroot/blog`。

`compose.production.yml` 统一管理 Astro SSR 和 Directus：

```sh
cd /www/wwwroot/blog
docker compose -f compose.production.yml ps
docker compose -f compose.production.yml logs --tail=100 web directus
docker compose -f compose.production.yml up -d --build --wait
```

- `https://blog.tsinbei.com`：完整 SSR 页面、文章正文、canonical 和 RSS。发布内容不需要重新构建；HTML 返回 `no-store`。
- `https://blog.tsinbei.cn`：EdgeOne 加速的 `/_astro/`、`/js/`、`/user/avatar/`，以及 `/api/search` 和 `/api/comment`。根路径和管理页面返回 404。
- Astro 通过 Compose 内网调用 Directus；浏览器不接触 Directus Token。跨域 API 只允许博客来源，评论及搜索不缓存。
- CSS 和客户端模块通过 Astro `assetsPrefix` 指向 `.cn`；普通脚本与浏览器 API 使用 `PUBLIC_RESOURCE_ORIGIN`。原有正文媒体和第三方 CDN 地址保持原样。
- 源站对 `/_astro/` 哈希资源设置一年 immutable 缓存，普通 `/js/` 为五分钟。上线实测加速链路将公网缓存头改为 `max-age=0`、返回 MISS；本次未修改 CDN/WAF 配置，不代表已实现边缘缓存命中。
- Directus 数据保存在 `directus/database`、`directus/uploads`、`directus/extensions`，均不进入 Git；8055 端口绑定服务器 loopback 和 Docker bridge 网关，供 Caddy 转发。

管理后台入口：`https://blog.tsinbei.com/admin`，自动跳转到同域名的 `/directus/admin/login`。Directus 的管理页面和 API 统一位于 `/directus/`，避免与博客路由冲突。`.cn` 的管理页面仍返回 404。

也可以通过 SSH 隧道访问（在自己的电脑运行）：

```sh
ssh -N -L 18055:127.0.0.1:8055 root@sapiens-lxq
```

然后打开 `http://localhost:18055/admin/`。管理员凭据在服务器 `directus/runtime.env`，网站 Token 在 `.env`。

Caddy 在 `Caddy` 容器中，配置文件为 `/data/caddy/Caddyfile`。Astro 仅绑定 Docker bridge 网关 `192.168.32.1:4433` 供 Caddy 转发。

本次切换备份：`/data/backups/kylin-20261126-160038/`，包含原 Caddyfile、旧 Typecho 目录及归档。旧站数据库由原 Typecho 配置指定；本次未删除或修改它。

首次部署因服务器无法访问 Docker Hub，使用本机构建并传入的 `kylin-blog-web:latest` 与 Directus 镜像。后续代码更新可在服务器构建；若镜像仓库仍不可达，使用本机 `docker build` / `docker save`，再通过 `scp` 和 `docker load` 更新镜像，执行：

```sh
docker compose -f compose.production.yml up -d --no-build --pull never --wait
```

文章和评论更新只写数据库，不执行上述部署命令。修改前端代码或构建参数才需重新构建。
