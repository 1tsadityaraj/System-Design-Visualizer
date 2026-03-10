// ──────────────────────────────────────────────────────────────
// Infrastructure-as-Code (IaC) Generator
// Converts React Flow diagrams into Docker Compose YAML,
// Terraform HCL, and Kubernetes Manifests configurations.
// ──────────────────────────────────────────────────────────────
import JSZip from 'jszip';

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
    terraform: (label, region, size) => `
resource "aws_instance" "${sanitize(label)}" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  tags = {
    Name        = "${label}"
    Environment = var.environment
    ManagedBy   = "SysDesign-Visualizer"
    Region      = "${region}"
  }
}`,
    k8s: (label, port = 3000) => ({
      deployment: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: sanitize(label), labels: { app: sanitize(label) } },
        spec: {
          replicas: 2,
          selector: { matchLabels: { app: sanitize(label) } },
          template: {
            metadata: { labels: { app: sanitize(label) } },
            spec: {
              containers: [{
                name: sanitize(label),
                image: `${sanitize(label)}:latest`,
                ports: [{ containerPort: port }],
                resources: {
                  requests: { cpu: '100m', memory: '128Mi' },
                  limits: { cpu: '500m', memory: '512Mi' },
                },
                livenessProbe: {
                  httpGet: { path: '/health', port },
                  initialDelaySeconds: 15,
                  periodSeconds: 10,
                },
                readinessProbe: {
                  httpGet: { path: '/ready', port },
                  initialDelaySeconds: 5,
                  periodSeconds: 5,
                },
                env: [
                  { name: 'NODE_ENV', value: 'production' },
                ],
              }],
            },
          },
        },
      },
      service: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: sanitize(label) },
        spec: {
          selector: { app: sanitize(label) },
          ports: [{ port: port, targetPort: port, protocol: 'TCP' }],
          type: 'ClusterIP',
        },
      },
      hpa: {
        apiVersion: 'autoscaling/v2',
        kind: 'HorizontalPodAutoscaler',
        metadata: { name: `${sanitize(label)}-hpa` },
        spec: {
          scaleTargetRef: {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            name: sanitize(label),
          },
          minReplicas: 2,
          maxReplicas: 10,
          metrics: [{
            type: 'Resource',
            resource: { name: 'cpu', target: { type: 'Utilization', averageUtilization: 70 } },
          }],
        },
      },
    }),
  },
  lambda: {
    docker: (label) => ({
      image: 'amazon/aws-lambda-nodejs:18',
      container_name: sanitize(label),
      environment: ['AWS_LAMBDA_FUNCTION_HANDLER=index.handler'],
      networks: ['app-network'],
    }),
    terraform: (label, region) => `
resource "aws_lambda_function" "${sanitize(label)}" {
  function_name = "${sanitize(label)}"
  runtime       = "nodejs18.x"
  handler       = "index.handler"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout

  tags = {
    Name        = "${label}"
    Environment = var.environment
    ManagedBy   = "SysDesign-Visualizer"
  }
}`,
    k8s: (label) => ({
      deployment: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: sanitize(label), labels: { app: sanitize(label) } },
        spec: {
          replicas: 1,
          selector: { matchLabels: { app: sanitize(label) } },
          template: {
            metadata: { labels: { app: sanitize(label) } },
            spec: {
              containers: [{
                name: sanitize(label),
                image: `${sanitize(label)}:latest`,
                ports: [{ containerPort: 8080 }],
                resources: {
                  requests: { cpu: '50m', memory: '64Mi' },
                  limits: { cpu: '200m', memory: '128Mi' },
                },
              }],
            },
          },
        },
      },
      service: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: sanitize(label) },
        spec: {
          selector: { app: sanitize(label) },
          ports: [{ port: 8080, targetPort: 8080 }],
          type: 'ClusterIP',
        },
      },
    }),
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
    terraform: (label, region, size) => `
resource "aws_db_instance" "${sanitize(label)}" {
  allocated_storage    = var.db_allocated_storage
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = var.db_instance_class
  db_name              = "app"
  username             = var.db_username
  password             = var.db_password
  skip_final_snapshot  = var.environment != "production"
  multi_az             = var.environment == "production"
  storage_encrypted    = true

  vpc_security_group_ids = [var.db_security_group_id]
  db_subnet_group_name   = var.db_subnet_group_name

  tags = {
    Name        = "${label}"
    Environment = var.environment
    ManagedBy   = "SysDesign-Visualizer"
  }
}`,
    k8s: (label) => ({
      deployment: {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: { name: sanitize(label) },
        spec: {
          serviceName: sanitize(label),
          replicas: 1,
          selector: { matchLabels: { app: sanitize(label) } },
          template: {
            metadata: { labels: { app: sanitize(label) } },
            spec: {
              containers: [{
                name: sanitize(label),
                image: 'postgres:15-alpine',
                ports: [{ containerPort: 5432 }],
                env: [
                  { name: 'POSTGRES_USER', valueFrom: { secretKeyRef: { name: `${sanitize(label)}-secret`, key: 'username' } } },
                  { name: 'POSTGRES_PASSWORD', valueFrom: { secretKeyRef: { name: `${sanitize(label)}-secret`, key: 'password' } } },
                ],
                volumeMounts: [{ name: 'data', mountPath: '/var/lib/postgresql/data' }],
              }],
            },
          },
          volumeClaimTemplates: [{
            metadata: { name: 'data' },
            spec: {
              accessModes: ['ReadWriteOnce'],
              resources: { requests: { storage: '10Gi' } },
            },
          }],
        },
      },
      service: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: sanitize(label) },
        spec: {
          selector: { app: sanitize(label) },
          ports: [{ port: 5432, targetPort: 5432 }],
          clusterIP: 'None',
        },
      },
    }),
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
  master_username     = var.db_username
  master_password     = var.db_password
  storage_encrypted   = true

  tags = {
    Name        = "${label}"
    Environment = var.environment
    ManagedBy   = "SysDesign-Visualizer"
  }
}`,
    k8s: (label) => ({
      deployment: {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: { name: sanitize(label) },
        spec: {
          serviceName: sanitize(label),
          replicas: 1,
          selector: { matchLabels: { app: sanitize(label) } },
          template: {
            metadata: { labels: { app: sanitize(label) } },
            spec: {
              containers: [{
                name: sanitize(label),
                image: 'mongo:7',
                ports: [{ containerPort: 27017 }],
                volumeMounts: [{ name: 'data', mountPath: '/data/db' }],
              }],
            },
          },
          volumeClaimTemplates: [{
            metadata: { name: 'data' },
            spec: {
              accessModes: ['ReadWriteOnce'],
              resources: { requests: { storage: '20Gi' } },
            },
          }],
        },
      },
      service: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: sanitize(label) },
        spec: {
          selector: { app: sanitize(label) },
          ports: [{ port: 27017, targetPort: 27017 }],
          clusterIP: 'None',
        },
      },
    }),
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
  bucket = "${sanitize(label)}-\${var.environment}"

  tags = {
    Name        = "${label}"
    Environment = var.environment
    ManagedBy   = "SysDesign-Visualizer"
  }
}

resource "aws_s3_bucket_versioning" "${sanitize(label)}_versioning" {
  bucket = aws_s3_bucket.${sanitize(label)}.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "${sanitize(label)}_encryption" {
  bucket = aws_s3_bucket.${sanitize(label)}.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
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
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  tags = {
    Name        = "${label}"
    Environment = var.environment
    ManagedBy   = "SysDesign-Visualizer"
  }
}

resource "aws_lb_listener" "${sanitize(label)}_https" {
  load_balancer_arn = aws_lb.${sanitize(label)}.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.${sanitize(label)}_tg.arn
  }
}`,
    k8s: (label) => ({
      service: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: sanitize(label),
          annotations: { 'service.beta.kubernetes.io/aws-load-balancer-type': 'nlb' },
        },
        spec: {
          type: 'LoadBalancer',
          selector: { app: sanitize(label) },
          ports: [{ port: 80, targetPort: 80 }, { port: 443, targetPort: 443 }],
        },
      },
    }),
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
    Name        = "${label}"
    Environment = var.environment
    ManagedBy   = "SysDesign-Visualizer"
  }
}`,
    k8s: (label) => ({
      deployment: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: sanitize(label), labels: { app: sanitize(label) } },
        spec: {
          replicas: 2,
          selector: { matchLabels: { app: sanitize(label) } },
          template: {
            metadata: { labels: { app: sanitize(label) } },
            spec: {
              containers: [{
                name: sanitize(label),
                image: 'kong:latest',
                ports: [{ containerPort: 8000 }, { containerPort: 8443 }],
                resources: {
                  requests: { cpu: '200m', memory: '256Mi' },
                  limits: { cpu: '1000m', memory: '1Gi' },
                },
              }],
            },
          },
        },
      },
      service: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: sanitize(label) },
        spec: {
          selector: { app: sanitize(label) },
          ports: [{ name: 'proxy', port: 8000, targetPort: 8000 }, { name: 'proxy-ssl', port: 8443, targetPort: 8443 }],
          type: 'ClusterIP',
        },
      },
      ingress: {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
          name: `${sanitize(label)}-ingress`,
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
            'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
          },
        },
        spec: {
          tls: [{ hosts: ['api.example.com'], secretName: `${sanitize(label)}-tls` }],
          rules: [{
            host: 'api.example.com',
            http: {
              paths: [{
                path: '/',
                pathType: 'Prefix',
                backend: { service: { name: sanitize(label), port: { number: 8000 } } },
              }],
            },
          }],
        },
      },
    }),
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
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${label}"
    Environment = var.environment
    ManagedBy   = "SysDesign-Visualizer"
  }
}`,
  },
  cache: {
    docker: (label) => ({
      image: 'redis:7-alpine',
      container_name: sanitize(label),
      ports: ['6379:6379'],
      command: 'redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru',
      restart: 'unless-stopped',
      networks: ['app-network'],
    }),
    terraform: (label) => `
resource "aws_elasticache_cluster" "${sanitize(label)}" {
  cluster_id           = "${sanitize(label)}"
  engine               = "redis"
  node_type            = var.cache_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  security_group_ids   = [var.cache_security_group_id]
  subnet_group_name    = var.cache_subnet_group_name

  tags = {
    Name        = "${label}"
    Environment = var.environment
    ManagedBy   = "SysDesign-Visualizer"
  }
}`,
    k8s: (label) => ({
      deployment: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: sanitize(label), labels: { app: sanitize(label) } },
        spec: {
          replicas: 1,
          selector: { matchLabels: { app: sanitize(label) } },
          template: {
            metadata: { labels: { app: sanitize(label) } },
            spec: {
              containers: [{
                name: sanitize(label),
                image: 'redis:7-alpine',
                ports: [{ containerPort: 6379 }],
                command: ['redis-server', '--maxmemory', '256mb', '--maxmemory-policy', 'allkeys-lru'],
                resources: {
                  requests: { cpu: '100m', memory: '256Mi' },
                  limits: { cpu: '500m', memory: '512Mi' },
                },
              }],
            },
          },
        },
      },
      service: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: sanitize(label) },
        spec: {
          selector: { app: sanitize(label) },
          ports: [{ port: 6379, targetPort: 6379 }],
          type: 'ClusterIP',
        },
      },
    }),
  },
  queue: {
    docker: (label) => ({
      image: 'rabbitmq:3-management-alpine',
      container_name: sanitize(label),
      ports: ['5672:5672', '15672:15672'],
      restart: 'unless-stopped',
      networks: ['app-network'],
    }),
    terraform: (label) => `
resource "aws_sqs_queue" "${sanitize(label)}" {
  name                       = "${sanitize(label)}"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 345600
  visibility_timeout_seconds = 30

  tags = {
    Name        = "${label}"
    Environment = var.environment
    ManagedBy   = "SysDesign-Visualizer"
  }
}`,
    k8s: (label) => ({
      deployment: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: sanitize(label), labels: { app: sanitize(label) } },
        spec: {
          replicas: 1,
          selector: { matchLabels: { app: sanitize(label) } },
          template: {
            metadata: { labels: { app: sanitize(label) } },
            spec: {
              containers: [{
                name: sanitize(label),
                image: 'rabbitmq:3-management-alpine',
                ports: [{ containerPort: 5672 }, { containerPort: 15672 }],
              }],
            },
          },
        },
      },
      service: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: sanitize(label) },
        spec: {
          selector: { app: sanitize(label) },
          ports: [{ name: 'amqp', port: 5672, targetPort: 5672 }, { name: 'management', port: 15672, targetPort: 15672 }],
          type: 'ClusterIP',
        },
      },
    }),
  },
};

function sanitize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// ── Docker Compose Generator ──
export function generateDockerCompose(nodes, edges) {
  const services = {};
  const volumes = {};

  const deps = {};
  edges.forEach(e => {
    if (!deps[e.source]) deps[e.source] = [];
    deps[e.source].push(e.target);
  });

  let portOffset = 0;

  nodes.forEach(node => {
    const { subtype, label } = node.data;
    const template = SERVICE_TEMPLATES[subtype];
    if (!template?.docker) return;

    const svcName = sanitize(label);
    const svc = template.docker(label, 3000 + portOffset++);

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

// ── Terraform Generator (Improved HCL with Variables) ──
export function generateTerraform(nodes, edges) {
  // Collect unique regions
  const regions = new Set(nodes.map(n => n.data.region || 'us-east-1').filter(r => r !== 'global'));
  const primaryRegion = [...regions][0] || 'us-east-1';

  let tf = `# ──────────────────────────────────────────────────────────
# Generated by SysDesign Visualizer v2.0
# Terraform Configuration with Variables
# ──────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "terraform-state-sysdesign"
    key    = "infrastructure/terraform.tfstate"
    region = "${primaryRegion}"
  }
}

# ─── Variables ───────────────────────────────────────────

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "region" {
  description = "Primary AWS region"
  type        = string
  default     = "${primaryRegion}"
}

variable "instance_type" {
  description = "EC2 instance type for compute nodes"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID for EC2 instances"
  type        = string
  default     = "ami-0c55b159cbfafe1f0"
}

variable "subnet_id" {
  description = "Subnet ID for EC2 instances"
  type        = string
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_security_group_id" {
  description = "Security group ID for database"
  type        = string
  default     = ""
}

variable "db_subnet_group_name" {
  description = "DB subnet group name"
  type        = string
  default     = ""
}

variable "cache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "cache_security_group_id" {
  description = "Security group ID for cache"
  type        = string
  default     = ""
}

variable "cache_subnet_group_name" {
  description = "ElastiCache subnet group name"
  type        = string
  default     = ""
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 128
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
  default     = []
}

variable "alb_security_group_id" {
  description = "Security group ID for ALB"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

# ─── Provider ────────────────────────────────────────────

provider "aws" {
  region = var.region
}

# ─── Resources ───────────────────────────────────────────
`;

  nodes.forEach(node => {
    const { subtype, label, region = 'us-east-1', size = 't3.micro' } = node.data;
    const template = SERVICE_TEMPLATES[subtype];
    if (!template?.terraform) return;
    tf += template.terraform(label, region, size) + '\n';
  });

  // Add outputs
  tf += `
# ─── Outputs ─────────────────────────────────────────────

output "architecture_summary" {
  value = {
    total_resources = ${nodes.length}
    environment     = var.environment
    region          = var.region
  }
}
`;

  return tf;
}

// ── Kubernetes Manifest Generator (ZIP) ──
export async function generateK8sZip(nodes, edges) {
  const zip = new JSZip();
  const namespace = 'sysdesign-app';

  // Namespace
  zip.file('namespace.yaml', toYamlDoc({
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: namespace,
      labels: { 'app.kubernetes.io/managed-by': 'sysdesign-visualizer' },
    },
  }));

  // Generate manifests for each node
  const allDeployments = [];
  const allServices = [];
  const allIngresses = [];
  const allHPAs = [];

  nodes.forEach(node => {
    const { subtype, label } = node.data;
    const template = SERVICE_TEMPLATES[subtype];
    if (!template?.k8s) return;

    const k8s = template.k8s(label);
    const name = sanitize(label);

    if (k8s.deployment) {
      k8s.deployment.metadata.namespace = namespace;
      allDeployments.push(k8s.deployment);
      zip.file(`deployments/${name}-deployment.yaml`, toYamlDoc(k8s.deployment));
    }
    if (k8s.service) {
      k8s.service.metadata.namespace = namespace;
      allServices.push(k8s.service);
      zip.file(`services/${name}-service.yaml`, toYamlDoc(k8s.service));
    }
    if (k8s.ingress) {
      k8s.ingress.metadata.namespace = namespace;
      allIngresses.push(k8s.ingress);
      zip.file(`ingress/${name}-ingress.yaml`, toYamlDoc(k8s.ingress));
    }
    if (k8s.hpa) {
      k8s.hpa.metadata.namespace = namespace;
      allHPAs.push(k8s.hpa);
      zip.file(`hpa/${name}-hpa.yaml`, toYamlDoc(k8s.hpa));
    }
  });

  // Combined "all-in-one" file
  const allResources = [
    ...allDeployments,
    ...allServices,
    ...allIngresses,
    ...allHPAs,
  ];
  if (allResources.length > 0) {
    zip.file('all-in-one.yaml', allResources.map(r => toYamlDoc(r)).join('\n---\n\n'));
  }

  // README
  zip.file('README.md', `# Kubernetes Manifests
Generated by SysDesign Visualizer v2.0

## Apply All
\`\`\`bash
kubectl apply -f namespace.yaml
kubectl apply -f deployments/
kubectl apply -f services/
kubectl apply -f ingress/
kubectl apply -f hpa/
\`\`\`

## Or apply at once
\`\`\`bash
kubectl apply -f all-in-one.yaml
\`\`\`

## Resources Generated
- Deployments: ${allDeployments.length}
- Services: ${allServices.length}
- Ingress: ${allIngresses.length}
- HPAs: ${allHPAs.length}
`);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'k8s-manifests.zip';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Simple YAML serialiser ──
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

// ── YAML document serialiser for K8s ──
function toYamlDoc(obj) {
  return yamlStringify(obj);
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
