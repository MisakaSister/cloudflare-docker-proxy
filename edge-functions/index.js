const dockerHub = "https://registry-1.docker.io";

function getRoutes(customDomain) {
  if (!customDomain) return {};
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

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    
    const CUSTOM_DOMAIN = env?.CUSTOM_DOMAIN || "";
    const MODE = env?.MODE || "production";
    const TARGET_UPSTREAM = env?.TARGET_UPSTREAM || "";
    
    const routes = getRoutes(CUSTOM_DOMAIN);
    let upstream = routeByHosts(url.hostname, routes, MODE, TARGET_UPSTREAM);
    
    // 如果使用 EdgeOne Pages 默认域名，需要特殊处理
    const isEdgeOneDefaultDomain = url.hostname.includes(".edgeone.");
    
    if (upstream === "" && isEdgeOneDefaultDomain) {
      // 尝试从查询参数获取路由类型
      const routeType = url.searchParams.get("route") || url.searchParams.get("registry");
      if (routeType && CUSTOM_DOMAIN) {
        const routeKey = routeType + "." + CUSTOM_DOMAIN;
        if (routeKey in routes) {
          upstream = routes[routeKey];
        }
      }
      
      // 如果仍然没有匹配，且设置了 TARGET_UPSTREAM，使用它作为默认上游
      if (upstream === "" && TARGET_UPSTREAM) {
        upstream = TARGET_UPSTREAM;
      }
      
      // 如果还是没有匹配，默认使用 Docker Hub（这是最常见的用例）
      if (upstream === "") {
        upstream = dockerHub;
      }
    }
    
    // 如果还是没有匹配到任何上游，返回错误信息
    if (upstream === "") {
      return new Response(
        JSON.stringify({
          error: "NOT_FOUND",
          message: "The requested route does not match any configured upstream",
          hostname: url.hostname,
          CUSTOM_DOMAIN: CUSTOM_DOMAIN || "(not set)",
          availableRoutes: Object.keys(routes),
          hint: CUSTOM_DOMAIN
            ? `Please access using one of: ${Object.keys(routes).join(", ")}`
            : "Please set CUSTOM_DOMAIN environment variable in EdgeOne Pages settings",
          usage: isEdgeOneDefaultDomain
            ? "When using EdgeOne default domain, it defaults to Docker Hub. Use ?route=docker|quay|gcr|ghcr to specify other registries."
            : "Use custom domain subdomains to access different registries",
        }, null, 2),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    return await handleRequest(request, upstream, MODE);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
