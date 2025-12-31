# edgeone-docker-proxy

<<<<<<< HEAD
Docker registry proxy using EdgeOne Edge Functions.
=======
> ### ⚠️ **Important Notice**
> <span style="color:#d73a49;font-weight:bold">Docker Hub is rate-limiting Cloudflare Worker IPs, causing frequent <code>429</code> errors.</span>  
> <span style="color:#d73a49;font-weight:bold">This project is currently NOT recommended for production use.</span>


Due to the current instability, this project is not recommended for production use.
We will provide updates as soon as more information becomes available.


![deploy](https://github.com/ciiiii/cloudflare-docker-proxy/actions/workflows/deploy.yaml/badge.svg)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ciiiii/cloudflare-docker-proxy)
>>>>>>> 5f0b9200de4aa7ad8adade8c91fd61ec420ef152

> If you're looking for proxy for helm, maybe you can try [cloudflare-helm-proxy](https://github.com/ciiiii/cloudflare-helm-proxy).

## Deploy

1. Build the project: `npm run build`
2. Deploy to EdgeOne Edge Functions through EdgeOne console
3. Configure environment variables in EdgeOne console or `edgeone.config.json`
4. Update routes configuration as needed

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
3. Update the routes in `src/index.js` as needed:

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

