# edgeone-docker-proxy

Docker registry proxy using EdgeOne Edge Functions.

> If you're looking for proxy for helm, maybe you can try [cloudflare-helm-proxy](https://github.com/ciiiii/cloudflare-helm-proxy).

## Deploy to EdgeOne Pages

### 快速部署步骤

1. **连接 Git 仓库**
   - 在 EdgeOne Pages 控制台选择您的 GitHub 仓库
   - 选择分支：`master`

2. **配置项目**
   - **项目名称**：`cloudflare-docker-proxy` 或 `edgeone-docker-proxy`
   - **加速区域**：`全球可用区(含中国大陆)`
   - **生产分支**：`master`

3. **构建设置**
   - **框架预设**：`Other`
   - **根目录**：`/`
   - **输出目录**：留空（Edge Functions 不需要输出目录）
   - **构建命令**：留空或 `npm run build`（可选）
   - **安装命令**：`npm install`

4. **环境变量配置**
   添加以下环境变量：
   ```
   CUSTOM_DOMAIN=libcuda.so
   MODE=production
   TARGET_UPSTREAM=
   ```

5. **函数目录**
   - 项目已包含 `edge-functions/index.js` 文件
   - EdgeOne Pages 会自动识别并部署 `edge-functions` 目录中的函数

6. **开始部署**
   - 点击"开始部署"按钮
   - 等待部署完成

## Configuration

### Environment Variables

Configure the following environment variables in EdgeOne console or `edgeone.config.json`:

- `CUSTOM_DOMAIN`: Your custom domain (e.g., `libcuda.so`)
- `MODE`: Running mode (`production`, `staging`, or `debug`)
- `TARGET_UPSTREAM`: Target upstream URL (used in debug mode)

### Routes Configuration

The proxy supports multiple Docker registries routed by hostname. Configure your domain DNS on EdgeOne:

1. Add DNS records for your subdomains (e.g., `docker.example.com`, `quay.example.com`)
2. Configure EdgeOne Edge Functions routes to match these subdomains
3. Update the routes in `edge-functions/index.js` as needed:

   ```javascript
   const routes = {
     "docker.libcuda.so": "https://registry-1.docker.io",
     "quay.libcuda.so": "https://quay.io",
     "gcr.libcuda.so": "https://gcr.io",
     "k8s-gcr.libcuda.so": "https://k8s.gcr.io",
     "k8s.libcuda.so": "https://registry.k8s.io",
     "ghcr.libcuda.so": "https://ghcr.io",
     "cloudsmith.libcuda.so": "https://docker.cloudsmith.io",
     "ecr.libcuda.so": "https://public.ecr.aws",
   };
   ```

## Supported Registries

- Docker Hub (`docker.*`)
- Quay.io (`quay.*`)
- Google Container Registry (`gcr.*`)
- Kubernetes GCR (`k8s-gcr.*`)
- Kubernetes Registry (`k8s.*`)
- GitHub Container Registry (`ghcr.*`)
- Cloudsmith (`cloudsmith.*`)
- Amazon ECR Public (`ecr.*`)

