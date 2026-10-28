# P9 · SSO 身份与签收审计

> 现状：签收已走 Host service，但 Host 使用 mock identity；`actor` 不能作为生产身份。
> 目标：把“谁点了签收”变成可验证、可审计的内网身份，而不是 Agent/前端自报。

## 1. 要做的事

### A. 身份认证

从内网 SSO/OIDC/统一登录获取：

```text
user id
display name
email/工号
groups / roles
session id
expiry
```

Host 侧解析，不允许客户端传 `actor` 决定身份。

### B. 角色映射

把组织角色映射到 DataOps 角色：

```text
BA
requester
SE
Dev
Committer（仅记录外部合入状态，不等于代码平台权限）
```

来源优先级：

1. EDevOps/组织角色；
2. 项目/团队角色；
3. 明确配置的管理员映射；
4. 缺失 → 拒绝签收，显示“未授权角色”。

### C. Host 签收校验

每次签收：

```text
SSO identity
+ workitem
+ gate
+ requested role
→ 角色是否匹配
→ gate 是否当前阶段
→ actionId 幂等
→ WorkitemStore 写 approvals
→ audit event
```

客户端传的 `role`/`actor` 只能作为“请求角色”，不能作为身份来源。

### D. 审计

至少记录：

```yaml
audit:
  at: ...
  userId: ...
  userName: ...
  role: BA
  gate: requirement
  workitemId: ...
  actionId: ...
  requestId: ...
  sessionId: ...
  result: approved|rejected|conflict
  source: dataops-web
```

- 只追加，不覆盖；
- 不写 token；
- 与 workitem approvals 对应；
- 外部合入/部署的审批 ID 单独记录，不能冒充 SSO 签收。

### E. UI

- 显示当前用户和角色；
- 无权限时隐藏/禁用签收；
- 失败显示“身份/角色不匹配”，不显示成“系统错误”；
- 外部 Committer 动作要明确“由代码平台执行”。

### F. 外部系统边界

- DataOps SSO 只解决 DataOps 签收身份；
- 代码合入、部署、发布、回滚仍由代码平台/发布平台审批；
- 不能把 DataOps 的 SSO 签收当作外部发布审批。

## 2. 接口

```ts
interface IdentityProvider {
  current(request: Request): Promise<{
    id: string
    name: string
    roles: string[]
    sessionId?: string
    expiresAt?: string
  }>
}

interface SignoffService {
  sign(input: {
    workitemId: string
    gate: string
    requestedRole: string
    actionId: string
    comment?: string
  }): Promise<ApprovalResult>
}
```

当前 `createSignoffService` 已接受 `identity` 注入；P9 只需替换 identity provider，不改卡片或 stage runtime。

## 3. 内网需要确认

1. SSO 协议：OIDC / SAML / 统一登录 header / 网关注入？
2. DSH Web 现有 cookie/identity 是否能带到插件？
3. 角色来源：EDevOps、组织通讯录、项目空间？
4. BA/SE/Committer 的映射规则；
5. Host 进程如何拿到 SSO claims；
6. 审计日志落盘/服务位置；
7. 外部代码/发布平台审批 ID 如何关联。

## 4. 分步实施

1. 定义 IdentityProvider + mock（本地已可做）
2. SignoffService 改为从 IdentityProvider 取身份，忽略客户端 actor
3. UI 显示当前身份/角色
4. 接内网 SSO claims
5. 写审计日志
6. 角色映射和拒绝路径测试
7. 真实内网 e2e：无权限用户不能签收；有权限用户签收可审计

## 5. 不在本阶段

- 不用 SSO 身份替代外部代码平台权限；
- 不实现外部发布审批；
- 不把 mock identity 当生产身份。
