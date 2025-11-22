# Private GKE Clusters Reference

Guide for setting up and managing private GKE clusters with restricted network access.

## Overview

Private clusters restrict access to:

- **Control plane**: Private IP only, no public endpoint
- **Nodes**: Private IP addresses, no external IPs
- **Egress**: Requires Cloud NAT for internet access

## Create Private Cluster

### Basic private cluster

```bash
gcloud container clusters create my-private-cluster \
  --region us-central1 \
  --enable-private-nodes \
  --enable-private-endpoint \
  --master-ipv4-cidr 172.16.0.0/28 \
  --enable-ip-alias \
  --network my-vpc \
  --subnetwork my-subnet \
  --no-enable-master-authorized-networks
```

### Private cluster with public endpoint for management

```bash
gcloud container clusters create my-private-cluster \
  --region us-central1 \
  --enable-private-nodes \
  --master-ipv4-cidr 172.16.0.0/28 \
  --enable-ip-alias \
  --network my-vpc \
  --subnetwork my-subnet \
  --enable-master-authorized-networks \
  --master-authorized-networks YOUR_IP/32
```

## Network Configuration

### VPC and Subnet Setup

1. Create VPC:

```bash
gcloud compute networks create my-vpc --subnet-mode=custom
```

2. Create subnet with secondary ranges:

```bash
gcloud compute networks subnets create my-subnet \
  --network=my-vpc \
  --region=us-central1 \
  --range=10.0.0.0/24 \
  --secondary-range pods=10.1.0.0/16,services=10.2.0.0/16
```

3. Create cluster using secondary ranges:

```bash
gcloud container clusters create my-cluster \
  --region us-central1 \
  --network my-vpc \
  --subnetwork my-subnet \
  --cluster-secondary-range-name pods \
  --services-secondary-range-name services \
  --enable-private-nodes \
  --enable-ip-alias \
  --master-ipv4-cidr 172.16.0.0/28
```

### Cloud NAT for Egress

Private nodes need Cloud NAT to access internet:

1. Create Cloud Router:

```bash
gcloud compute routers create my-router \
  --network=my-vpc \
  --region=us-central1
```

2. Configure Cloud NAT:

```bash
gcloud compute routers nats create my-nat \
  --router=my-router \
  --region=us-central1 \
  --nat-all-subnet-ip-ranges \
  --auto-allocate-nat-external-ips
```

## Accessing Private Clusters

### Option 1: Bastion Host

1. Create bastion VM:

```bash
gcloud compute instances create bastion \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --subnet=my-subnet \
  --scopes=cloud-platform
```

2. SSH to bastion:

```bash
gcloud compute ssh bastion --zone=us-central1-a
```

3. Install kubectl on bastion and configure:

```bash
# On bastion
gcloud container clusters get-credentials my-private-cluster --region us-central1
kubectl get nodes
```

### Option 2: Cloud Shell

Cloud Shell has network access to private clusters:

```bash
# In Cloud Shell
gcloud container clusters get-credentials my-private-cluster --region us-central1
kubectl get nodes
```

### Option 3: VPN or Interconnect

For on-premises access:

- Set up Cloud VPN or Cloud Interconnect
- Add authorized networks:

```bash
gcloud container clusters update my-private-cluster \
  --region us-central1 \
  --enable-master-authorized-networks \
  --master-authorized-networks ON_PREM_CIDR/24
```

### Option 4: Identity-Aware Proxy (IAP)

Use IAP for secure access without VPN:

1. Enable IAP on bastion:

```bash
gcloud compute firewall-rules create allow-ssh-from-iap \
  --network=my-vpc \
  --allow=tcp:22 \
  --source-ranges=35.235.240.0/20
```

2. Connect via IAP:

```bash
gcloud compute ssh bastion \
  --zone=us-central1-a \
  --tunnel-through-iap
```

## Authorized Networks

### Add authorized networks for kubectl access

```bash
# Add your IP
gcloud container clusters update my-private-cluster \
  --region us-central1 \
  --enable-master-authorized-networks \
  --master-authorized-networks YOUR_IP/32

# Add multiple CIDRs
gcloud container clusters update my-private-cluster \
  --region us-central1 \
  --master-authorized-networks \
    10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

## VPC Peering

### Connect to other VPCs

1. Create VPC peering:

```bash
gcloud compute networks peerings create peer-to-prod \
  --network=my-vpc \
  --peer-network=prod-vpc \
  --peer-project=OTHER_PROJECT
```

2. Create reciprocal peering:

```bash
gcloud compute networks peerings create peer-from-prod \
  --network=prod-vpc \
  --peer-network=my-vpc \
  --peer-project=MY_PROJECT \
  --project=OTHER_PROJECT
```

3. Update firewall rules to allow traffic:

```bash
gcloud compute firewall-rules create allow-from-peered-vpc \
  --network=my-vpc \
  --allow=tcp,udp,icmp \
  --source-ranges=PEERED_VPC_CIDR
```

## Shared VPC

For organization-level network sharing:

### Setup shared VPC (in host project)

```bash
# Enable shared VPC
gcloud compute shared-vpc enable HOST_PROJECT_ID

# Attach service project
gcloud compute shared-vpc associated-projects add SERVICE_PROJECT_ID \
  --host-project=HOST_PROJECT_ID
```

### Create GKE cluster in shared VPC

```bash
gcloud container clusters create my-cluster \
  --region us-central1 \
  --network "projects/HOST_PROJECT_ID/global/networks/shared-vpc" \
  --subnetwork "projects/HOST_PROJECT_ID/regions/us-central1/subnetworks/gke-subnet" \
  --enable-private-nodes \
  --enable-ip-alias \
  --master-ipv4-cidr 172.16.0.0/28 \
  --project=SERVICE_PROJECT_ID
```

## Firewall Rules

### Essential firewall rules for private clusters

```bash
# Allow internal traffic between pods and nodes
gcloud compute firewall-rules create allow-internal \
  --network=my-vpc \
  --allow=tcp,udp,icmp \
  --source-ranges=10.0.0.0/8

# Allow health checks from GCP load balancers
gcloud compute firewall-rules create allow-health-checks \
  --network=my-vpc \
  --allow=tcp \
  --source-ranges=35.191.0.0/16,130.211.0.0/22

# Allow SSH from IAP
gcloud compute firewall-rules create allow-ssh-iap \
  --network=my-vpc \
  --allow=tcp:22 \
  --source-ranges=35.235.240.0/20

# Allow kubectl from authorized networks
gcloud compute firewall-rules create allow-kubectl \
  --network=my-vpc \
  --allow=tcp:443,tcp:10250 \
  --source-ranges=YOUR_AUTHORIZED_CIDRS
```

## Private Google Access

Enable private access to Google APIs:

```bash
gcloud compute networks subnets update my-subnet \
  --region=us-central1 \
  --enable-private-ip-google-access
```

This allows nodes to access:

- Container Registry (gcr.io)
- Artifact Registry
- Cloud Storage
- Other Google APIs

Without requiring external IPs or Cloud NAT.

## DNS Configuration

### Private DNS zones

For internal service discovery:

```bash
# Create private DNS zone
gcloud dns managed-zones create my-internal-zone \
  --dns-name=internal.example.com. \
  --networks=my-vpc \
  --visibility=private \
  --description="Internal DNS zone"

# Add DNS record
gcloud dns record-sets create database.internal.example.com. \
  --zone=my-internal-zone \
  --type=A \
  --ttl=300 \
  --rrdatas=10.0.1.5
```

## Troubleshooting

### Cannot connect to control plane

**Check:**

1. Authorized networks configured:

```bash
gcloud container clusters describe my-cluster \
  --region us-central1 \
  --format="value(masterAuthorizedNetworksConfig.cidrBlocks)"
```

2. Your current IP:

```bash
curl ifconfig.me
```

3. Add your IP:

```bash
gcloud container clusters update my-cluster \
  --region us-central1 \
  --enable-master-authorized-networks \
  --master-authorized-networks $(curl -s ifconfig.me)/32
```

### Pods cannot reach internet

**Check Cloud NAT:**

```bash
gcloud compute routers nats list --router=my-router --region=us-central1
```

**Verify NAT logs:**

```bash
gcloud logging read "resource.type=nat_gateway" --limit=50
```

### Cannot pull images from gcr.io

**Enable Private Google Access:**

```bash
gcloud compute networks subnets update my-subnet \
  --region=us-central1 \
  --enable-private-ip-google-access
```

**Check node service account permissions:**

```bash
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:PROJECT_NUMBER-compute@developer.gserviceaccount.com"
```

Should have `roles/storage.objectViewer` for GCR access.

## Security Best Practices

1. **Use private endpoints** when possible
2. **Minimize authorized networks** to specific IPs/CIDRs
3. **Use VPC Service Controls** for additional protection
4. **Enable Binary Authorization** for deployment policies
5. **Use Workload Identity** instead of service account keys
6. **Regular audit** of authorized networks and firewall rules
7. **Monitor NAT gateway** for unusual egress patterns

## Cost Optimization

- Cloud NAT charges per VM and data processed
- Consider using Private Google Access to reduce NAT usage for GCP services
- Monitor NAT logs to identify high-usage sources
- Use committed use discounts for predictable workloads

## Reference

- [Private Clusters Documentation](https://cloud.google.com/kubernetes-engine/docs/how-to/private-clusters)
- [VPC Design Best Practices](https://cloud.google.com/vpc/docs/vpc)
- [Cloud NAT Documentation](https://cloud.google.com/nat/docs/overview)
