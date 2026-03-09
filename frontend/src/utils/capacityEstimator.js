// ──────────────────────────────────────────────
// Capacity Estimator
// Calculates resource needs based on user count
// ──────────────────────────────────────────────

const ESTIMATES = {
    server: (users) => {
        const rps = Math.ceil(users * 0.1); // 10% active
        const instances = Math.ceil(rps / 1000); // 1k RPS per instance
        const cpu = instances * 2;
        const ram = instances * 4;
        return {
            title: 'Compute Estimate',
            metrics: [
                { label: 'Est. RPS', value: rps.toLocaleString(), unit: 'req/s' },
                { label: 'Instances Needed', value: instances, unit: '' },
                { label: 'Total vCPU', value: cpu, unit: 'cores' },
                { label: 'Total RAM', value: ram, unit: 'GB' },
                { label: 'Est. Monthly Cost', value: `$${(instances * 35).toLocaleString()}`, unit: '' },
            ],
        };
    },
    lambda: (users) => {
        const invocations = Math.ceil(users * 5); // 5 invocations per user/day
        const durationMs = 200;
        const cost = ((invocations * durationMs) / 1000) * 0.0000166667;
        return {
            title: 'Lambda Estimate',
            metrics: [
                { label: 'Daily Invocations', value: invocations.toLocaleString(), unit: '' },
                { label: 'Avg Duration', value: durationMs, unit: 'ms' },
                { label: 'Memory', value: 128, unit: 'MB' },
                { label: 'Est. Daily Cost', value: `$${cost.toFixed(4)}`, unit: '' },
            ],
        };
    },
    sql: (users) => {
        const rowsPerUser = 50;
        const avgRowSize = 0.5; // KB
        const totalStorageGB = ((users * rowsPerUser * avgRowSize) / 1024 / 1024).toFixed(2);
        const connections = Math.min(Math.ceil(users * 0.01), 500);
        const iops = Math.ceil(users * 0.5);
        return {
            title: 'SQL Database Estimate',
            metrics: [
                { label: 'Total Rows', value: (users * rowsPerUser).toLocaleString(), unit: '' },
                { label: 'Storage Needed', value: totalStorageGB, unit: 'GB' },
                { label: 'Peak Connections', value: connections, unit: '' },
                { label: 'IOPS Required', value: iops.toLocaleString(), unit: '' },
                { label: 'Recommended', value: iops > 3000 ? 'io1/io2' : 'gp3', unit: '' },
            ],
        };
    },
    nosql: (users) => {
        const docsPerUser = 200;
        const avgDocSize = 2; // KB
        const totalStorageGB = ((users * docsPerUser * avgDocSize) / 1024 / 1024).toFixed(2);
        const wcu = Math.ceil(users * 0.05);
        const rcu = Math.ceil(users * 0.2);
        return {
            title: 'NoSQL Database Estimate',
            metrics: [
                { label: 'Total Documents', value: (users * docsPerUser).toLocaleString(), unit: '' },
                { label: 'Storage Needed', value: totalStorageGB, unit: 'GB' },
                { label: 'Write Capacity', value: wcu.toLocaleString(), unit: 'WCU' },
                { label: 'Read Capacity', value: rcu.toLocaleString(), unit: 'RCU' },
            ],
        };
    },
    balancer: (users) => {
        const rps = Math.ceil(users * 0.1);
        const bandwidth = ((rps * 5) / 1024).toFixed(2); // 5KB avg response
        return {
            title: 'Load Balancer Estimate',
            metrics: [
                { label: 'Peak RPS', value: rps.toLocaleString(), unit: 'req/s' },
                { label: 'Bandwidth', value: bandwidth, unit: 'GB/s' },
                { label: 'Health Checks', value: 'Every 30s', unit: '' },
                { label: 'Type', value: rps > 10000 ? 'NLB' : 'ALB', unit: '' },
            ],
        };
    },
    cdn: (users) => {
        const dailyRequests = users * 20;
        const bandwidthTB = ((dailyRequests * 500) / 1024 / 1024 / 1024 / 1024).toFixed(4); // 500KB avg
        return {
            title: 'CDN Estimate',
            metrics: [
                { label: 'Daily Requests', value: dailyRequests.toLocaleString(), unit: '' },
                { label: 'Bandwidth', value: bandwidthTB, unit: 'TB/day' },
                { label: 'Cache Hit Rate', value: '~85%', unit: '' },
                { label: 'Edge Locations', value: users > 100000 ? 'Global' : 'Regional', unit: '' },
            ],
        };
    },
    gateway: (users) => {
        const rps = Math.ceil(users * 0.15);
        return {
            title: 'API Gateway Estimate',
            metrics: [
                { label: 'Peak RPS', value: rps.toLocaleString(), unit: 'req/s' },
                { label: 'Rate Limit', value: Math.ceil(rps * 1.5).toLocaleString(), unit: 'req/s' },
                { label: 'Auth Type', value: 'JWT/OAuth2', unit: '' },
                { label: 'Monthly Calls', value: (rps * 2592000).toLocaleString(), unit: '' },
            ],
        };
    },
    s3: (users) => {
        const avgFilesMB = 50;
        const storageTB = ((users * avgFilesMB) / 1024 / 1024).toFixed(2);
        return {
            title: 'Object Storage Estimate',
            metrics: [
                { label: 'Avg Storage/User', value: avgFilesMB, unit: 'MB' },
                { label: 'Total Storage', value: storageTB, unit: 'TB' },
                { label: 'Storage Class', value: storageTB > 1 ? 'S3 IA' : 'S3 Standard', unit: '' },
                { label: 'Monthly Cost', value: `$${(storageTB * 23).toFixed(2)}`, unit: '' },
            ],
        };
    },
};

export function estimateCapacity(subtype, userCount) {
    const estimator = ESTIMATES[subtype];
    if (!estimator) {
        return {
            title: 'Capacity Estimate',
            metrics: [{ label: 'No estimator', value: 'N/A', unit: '' }],
        };
    }
    return estimator(userCount);
}
