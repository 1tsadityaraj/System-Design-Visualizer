// ──────────────────────────────────────────────────────────────
// Infrastructure-as-Code (IaC) Generator
// Converts React Flow diagrams into Docker Compose YAML
// and Terraform HCL configurations.
// ──────────────────────────────────────────────────────────────

const SERVICE_TEMPLATES = {
    server: {
        docker: (label, port = 3000) => ({
            image: 'node:18-alpine',
            container_name: sanitize(label),
            ports: [`${port}:${port}`],
            environment: ['NODE_ENV=production'],
            depends_on: [],
            restart: 'unless-stopped',
            networks: ['app-network'],
        }),
        terraform: (label) => `
resource "aws_instance" "${sanitize(label)}" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  
  tags = {
    Name = "${label}"
    ManagedBy = "SysDesign-Visualizer"
  }
}`,
    },
    lambda: {
        docker: (label) => ({
            image: 'amazon/aws-lambda-nodejs:18',
            container_name: sanitize(label),
            environment: ['AWS_LAMBDA_FUNCTION_HANDLER=index.handler'],
            networks: ['app-network'],
        }),
        terraform: (label) => `
resource "aws_lambda_function" "${sanitize(label)}" {
  function_name = "${sanitize(label)}"
  runtime       = "nodejs18.x"
  handler       = "index.handler"
  memory_size   = 128
  timeout       = 30

  tags = {
    Name = "${label}"
    ManagedBy = "SysDesign-Visualizer"
  }
}`,
    },
    sql: {
        docker: (label) => ({
            image: 'postgres:15-alpine',
            container_name: sanitize(label),
            ports: ['5432:5432'],
            environment: [
                'POSTGRES_USER=admin',
                'POSTGRES_PASSWORD=changeme',
                'POSTGRES_DB=app',
            ],
            volumes: [`${sanitize(label)}-data:/var/lib/postgresql/data`],
            restart: 'unless-stopped',
            networks: ['app-network'],
        }),
        terraform: (label) => `
resource "aws_db_instance" "${sanitize(label)}" {
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = "db.t3.micro"
  db_name              = "app"
  username             = "admin"
  password             = "changeme"
  skip_final_snapshot  = true

  tags = {
    Name = "${label}"
    ManagedBy = "SysDesign-Visualizer"
  }
}`,
    },
    nosql: {
        docker: (label) => ({
            image: 'mongo:7',
            container_name: sanitize(label),
            ports: ['27017:27017'],
            environment: [
                'MONGO_INITDB_ROOT_USERNAME=admin',
                'MONGO_INITDB_ROOT_PASSWORD=changeme',
            ],
            volumes: [`${sanitize(label)}-data:/data/db`],
            restart: 'unless-stopped',
            networks: ['app-network'],
        }),
        terraform: (label) => `
resource "aws_docdb_cluster" "${sanitize(label)}" {
  cluster_identifier  = "${sanitize(label)}"
  engine              = "docdb"
  master_username     = "admin"
  master_password     = "changeme"
  
  tags = {
    Name = "${label}"
    ManagedBy = "SysDesign-Visualizer"
  }
}`,
    },
    s3: {
        docker: (label) => ({
            image: 'minio/minio:latest',
            container_name: sanitize(label),
            command: 'server /data --console-address ":9001"',
            ports: ['9000:9000', '9001:9001'],
            environment: [
                'MINIO_ROOT_USER=minioadmin',
                'MINIO_ROOT_PASSWORD=minioadmin',
            ],
            volumes: [`${sanitize(label)}-data:/data`],
            networks: ['app-network'],
        }),
        terraform: (label) => `
resource "aws_s3_bucket" "${sanitize(label)}" {
  bucket = "${sanitize(label)}"

  tags = {
    Name = "${label}"
    ManagedBy = "SysDesign-Visualizer"
  }
}`,
    },
    balancer: {
        docker: (label) => ({
            image: 'nginx:alpine',
            container_name: sanitize(label),
            ports: ['80:80', '443:443'],
            volumes: ['./nginx.conf:/etc/nginx/nginx.conf:ro'],
            depends_on: [],
            restart: 'unless-stopped',
            networks: ['app-network'],
        }),
        terraform: (label) => `
resource "aws_lb" "${sanitize(label)}" {
  name               = "${sanitize(label)}"
  internal           = false
  load_balancer_type = "application"

  tags = {
    Name = "${label}"
    ManagedBy = "SysDesign-Visualizer"
  }
}`,
    },
    gateway: {
        docker: (label) => ({
            image: 'kong:latest',
            container_name: sanitize(label),
            ports: ['8000:8000', '8443:8443', '8001:8001'],
            environment: [
                'KONG_DATABASE=off',
                'KONG_PROXY_ACCESS_LOG=/dev/stdout',
                'KONG_ADMIN_ACCESS_LOG=/dev/stdout',
                'KONG_PROXY_ERROR_LOG=/dev/stderr',
                'KONG_ADMIN_ERROR_LOG=/dev/stderr',
            ],
            restart: 'unless-stopped',
            networks: ['app-network'],
        }),
        terraform: (label) => `
resource "aws_api_gateway_rest_api" "${sanitize(label)}" {
  name        = "${sanitize(label)}"
  description = "API Gateway managed by SysDesign Visualizer"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "${label}"
    ManagedBy = "SysDesign-Visualizer"
  }
}`,
    },
    cdn: {
        docker: (label) => ({
            image: 'nginx:alpine',
            container_name: sanitize(label),
            ports: ['8080:80'],
            volumes: ['./static:/usr/share/nginx/html:ro'],
            networks: ['app-network'],
        }),
        terraform: (label) => `
resource "aws_cloudfront_distribution" "${sanitize(label)}" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${label} - Managed by SysDesign Visualizer"
  
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "default"
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${label}"
    ManagedBy = "SysDesign-Visualizer"
  }
}`,
    },
};

function sanitize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// ── Docker Compose Generator ──
export function generateDockerCompose(nodes, edges) {
    const services = {};
    const volumes = {};

    // Build dependency map from edges
    const deps = {};
    edges.forEach(e => {
        if (!deps[e.source]) deps[e.source] = [];
        deps[e.source].push(e.target);
    });

    let portOffset = 0;

    nodes.forEach(node => {
        const { subtype, label } = node.data;
        const template = SERVICE_TEMPLATES[subtype];
        if (!template) return;

        const svcName = sanitize(label);
        const svc = template.docker(label, 3000 + portOffset++);

        // Wire up depends_on
        if (deps[node.id]) {
            const depNames = deps[node.id]
                .map(depId => nodes.find(n => n.id === depId))
                .filter(Boolean)
                .map(n => sanitize(n.data.label));
            if (svc.depends_on) {
                svc.depends_on = depNames;
            }
        } else if (svc.depends_on) {
            delete svc.depends_on;
        }

        // Collect volumes
        if (svc.volumes) {
            svc.volumes.forEach(v => {
                const volName = v.split(':')[0];
                if (!volName.startsWith('.') && !volName.startsWith('/')) {
                    volumes[volName] = { driver: 'local' };
                }
            });
        }

        services[svcName] = svc;
    });

    const compose = {
        version: '3.8',
        services,
        networks: {
            'app-network': {
                driver: 'bridge',
            },
        },
        ...(Object.keys(volumes).length > 0 ? { volumes } : {}),
    };

    return yamlStringify(compose);
}

// ── Terraform Generator ──
export function generateTerraform(nodes) {
    let tf = `# ──────────────────────────────────────────────
# Generated by SysDesign Visualizer
# Terraform Configuration
# ──────────────────────────────────────────────

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
`;

    nodes.forEach(node => {
        const { subtype, label } = node.data;
        const template = SERVICE_TEMPLATES[subtype];
        if (!template) return;
        tf += template.terraform(label) + '\n';
    });

    return tf;
}

// ── Simple YAML serialiser (no dependency needed) ──
function yamlStringify(obj, indent = 0) {
    const pad = ' '.repeat(indent);
    let result = '';

    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            result += `${pad}${key}:\n`;
            value.forEach(item => {
                if (typeof item === 'object') {
                    result += `${pad}  -\n`;
                    result += yamlStringify(item, indent + 4);
                } else {
                    result += `${pad}  - ${JSON.stringify(item)}\n`;
                }
            });
        } else if (typeof value === 'object' && value !== null) {
            result += `${pad}${key}:\n`;
            result += yamlStringify(value, indent + 2);
        } else {
            result += `${pad}${key}: ${JSON.stringify(value)}\n`;
        }
    }

    return result;
}

// ── Download helper ──
export function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
