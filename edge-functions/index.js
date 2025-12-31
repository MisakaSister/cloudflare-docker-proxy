const dockerHub = "https://registry-1.docker.io";

function getRoutes(customDomain) {
  if (!customDomain) return {};
  
  // 如果域名本身以 docker. 开头，直接使用它作为 Docker Hub 入口
  // 例如：docker.wengguodong.com -> Docker Hub
  // 同时支持其他子域名：quay.docker.wengguodong.com -> Quay.io
  if (customDomain.startsWith("docker.")) {
    return {
      [customDomain]: dockerHub, // 根域名直接指向 Docker Hub
      ["quay." + customDomain]: "https://quay.io",
      ["gcr." + customDomain]: "https://gcr.io",
      ["k8s-gcr." + customDomain]: "https://k8s.gcr.io",
      ["k8s." + customDomain]: "https://registry.k8s.io",
      ["ghcr." + customDomain]: "https://ghcr.io",
      ["cloudsmith." + customDomain]: "https://docker.cloudsmith.io",
      ["ecr." + customDomain]: "https://public.ecr.aws",
      ["docker-staging." + customDomain]: dockerHub,
    };
  }
  
  // 标准模式：使用子域名路由
  return {
    ["docker." + customDomain]: dockerHub,
    ["quay." + customDomain]: "https://quay.io",
    ["gcr." + customDomain]: "https://gcr.io",
    ["k8s-gcr." + customDomain]: "https://k8s.gcr.io",
    ["k8s." + customDomain]: "https://registry.k8s.io",
    ["ghcr." + customDomain]: "https://ghcr.io",
    ["cloudsmith." + customDomain]: "https://docker.cloudsmith.io",
    ["ecr." + customDomain]: "https://public.ecr.aws",
    ["docker-staging." + customDomain]: dockerHub,
  };
}

function routeByHosts(host, routes, mode, targetUpstream) {
  if (host in routes) {
    return routes[host];
  }
  if (mode == "debug" && targetUpstream) {
    return targetUpstream;
  }
  return "";
}

async function handleRequest(request, upstream, mode) {
  const url = new URL(request.url);
  if (url.pathname == "/") {
    return Response.redirect(url.protocol + "//" + url.host + "/v2/", 301);
  }
  const isDockerHub = upstream == dockerHub;
  const authorization = request.headers.get("Authorization");
  if (url.pathname == "/v2/") {
    const newUrl = new URL(upstream + "/v2/");
    const headers = new Headers();
    if (authorization) {
      headers.set("Authorization", authorization);
    }
    const resp = await fetch(newUrl.toString(), {
      method: "GET",
      headers: headers,
      redirect: "follow",
    });
    if (resp.status === 401) {
      return responseUnauthorized(url, mode);
    }
    return resp;
  }
  if (url.pathname == "/v2/auth") {
    const newUrl = new URL(upstream + "/v2/");
    const resp = await fetch(newUrl.toString(), {
      method: "GET",
      redirect: "follow",
    });
    if (resp.status !== 401) {
      return resp;
    }
    const authenticateStr = resp.headers.get("WWW-Authenticate");
    if (authenticateStr === null) {
      return resp;
    }
    const wwwAuthenticate = parseAuthenticate(authenticateStr);
    let scope = url.searchParams.get("scope");
    if (scope && isDockerHub) {
      let scopeParts = scope.split(":");
      if (scopeParts.length == 3 && !scopeParts[1].includes("/")) {
        scopeParts[1] = "library/" + scopeParts[1];
        scope = scopeParts.join(":");
      }
    }
    return await fetchToken(wwwAuthenticate, scope, authorization);
  }
  if (isDockerHub) {
    const pathParts = url.pathname.split("/");
    if (pathParts.length == 5) {
      pathParts.splice(2, 0, "library");
      const redirectUrl = new URL(url);
      redirectUrl.pathname = pathParts.join("/");
      return Response.redirect(redirectUrl, 301);
    }
  }
  const newUrl = new URL(upstream + url.pathname);
  const newReq = new Request(newUrl, {
    method: request.method,
    headers: request.headers,
    redirect: isDockerHub ? "manual" : "follow",
  });
  const resp = await fetch(newReq);
  if (resp.status == 401) {
    return responseUnauthorized(url, mode);
  }
  if (isDockerHub && resp.status == 307) {
    const location = new URL(resp.headers.get("Location"));
    const redirectResp = await fetch(location.toString(), {
      method: "GET",
      redirect: "follow",
    });
    return redirectResp;
  }
  return resp;
}

function parseAuthenticate(authenticateStr) {
  const re = /(?<=\=")(?:\\.|[^"\\])*(?=")/g;
  const matches = authenticateStr.match(re);
  if (matches == null || matches.length < 2) {
    throw new Error(`invalid Www-Authenticate Header: ${authenticateStr}`);
  }
  return {
    realm: matches[0],
    service: matches[1],
  };
}

async function fetchToken(wwwAuthenticate, scope, authorization) {
  const url = new URL(wwwAuthenticate.realm);
  if (wwwAuthenticate.service.length) {
    url.searchParams.set("service", wwwAuthenticate.service);
  }
  if (scope) {
    url.searchParams.set("scope", scope);
  }
  const headers = new Headers();
  if (authorization) {
    headers.set("Authorization", authorization);
  }
  return await fetch(url, { method: "GET", headers: headers });
}

function responseUnauthorized(url, mode) {
  const headers = new Headers();
  if (mode == "debug") {
    headers.set(
      "Www-Authenticate",
      `Bearer realm="http://${url.host}/v2/auth",service="edgeone-docker-proxy"`
    );
  } else {
    headers.set(
      "Www-Authenticate",
      `Bearer realm="https://${url.hostname}/v2/auth",service="edgeone-docker-proxy"`
    );
  }
  return new Response(JSON.stringify({ message: "UNAUTHORIZED" }), {
    status: 401,
    headers: headers,
  });
}

// index.js 只处理根路径 /，重定向到 /v2/
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  return Response.redirect(url.protocol + "//" + url.host + "/v2/", 301);
}
