import { describe, expect, it } from "vitest"

import { ValidatedBrand } from "@/branded"

describe("Branded Types - External API Compatibility", () => {
  // Mock external service that expects primitive strings
  const mockR2Service = {
    upload: (params: { tenantId: string; projectId: string; data: Buffer }) => {
      // Simulate strict type checking that some APIs do
      if (typeof params.tenantId !== "string") {
        throw new Error("tenantId must be a string")
      }
      if (typeof params.projectId !== "string") {
        throw new Error("projectId must be a string")
      }
      return Promise.resolve({ success: true, path: `/tenants/${params.tenantId}/projects/${params.projectId}` })
    },
  }

  // Mock database that expects primitive values
  const mockDatabase = {
    query: (sql: string, params: unknown[]) => {
      // Check all params are primitives
      for (const param of params) {
        if (typeof param === "object" && param !== null) {
          throw new Error(`Database params must be primitives, got ${typeof param}`)
        }
      }
      return Promise.resolve([{ id: 1, name: "Test" }])
    },
  }

  // Create branded types
  const TenantId = ValidatedBrand("TenantId", (s: string) => s.length > 0 && s.startsWith("tenant-"))
  const ProjectId = ValidatedBrand("ProjectId", (s: string) => /^[0-9a-f-]{36}$/.test(s))
  const Port = ValidatedBrand("Port", (n: number) => n >= 1 && n <= 65535)

  it("should work directly with external APIs expecting strings", async () => {
    const tenantId = TenantId.unsafeOf("tenant-123")
    const projectId = ProjectId.unsafeOf("123e4567-e89b-12d3-a456-426614174000")

    // Should work without unbrand
    const result = await mockR2Service.upload({
      tenantId,
      projectId,
      data: Buffer.from("test"),
    })

    expect(result.success).toBe(true)
    expect(result.path).toBe("/tenants/tenant-123/projects/123e4567-e89b-12d3-a456-426614174000")
  })

  it("should work with database queries", async () => {
    const tenantId = TenantId.unsafeOf("tenant-456")
    const projectId = ProjectId.unsafeOf("987fcdeb-51a2-43f1-9abc-def012345678")

    // Should work directly as parameters
    const result = await mockDatabase.query("SELECT * FROM data WHERE tenant_id = ? AND project_id = ?", [
      tenantId,
      projectId,
    ])

    expect(result).toHaveLength(1)
  })

  it("should work with JSON serialization", () => {
    const tenantId = TenantId.unsafeOf("tenant-789")
    const port = Port.unsafeOf(8080)

    const data = {
      tenantId,
      port,
      config: {
        host: "localhost",
        port,
      },
    }

    const json = JSON.stringify(data)
    const parsed = JSON.parse(json)

    // Should serialize as primitives
    expect(parsed).toEqual({
      tenantId: "tenant-789",
      port: 8080,
      config: {
        host: "localhost",
        port: 8080,
      },
    })

    // No weird object serialization
    expect(json).not.toContain('"0":')
    expect(json).not.toContain('"1":')
  })

  it("should support string interpolation and concatenation", () => {
    const tenantId = TenantId.unsafeOf("tenant-abc")
    const projectId = ProjectId.unsafeOf("11111111-2222-3333-4444-555555555555")

    // Template literals
    const path = `/api/v1/tenants/${tenantId}/projects/${projectId}/settings`
    expect(path).toBe("/api/v1/tenants/tenant-abc/projects/11111111-2222-3333-4444-555555555555/settings")

    // String concatenation
    const url = "https://api.example.com/tenants/" + tenantId + "/projects/" + projectId
    expect(url).toBe("https://api.example.com/tenants/tenant-abc/projects/11111111-2222-3333-4444-555555555555")
  })

  it("should support numeric operations", () => {
    const port = Port.unsafeOf(8080)
    const anotherPort = Port.unsafeOf(3000)

    // Arithmetic operations
    expect(port + 10).toBe(8090)
    expect(port - 80).toBe(8000)
    expect(port * 2).toBe(16160)
    expect(port / 2).toBe(4040)

    // Comparisons
    expect(port > anotherPort).toBe(true)
    expect(port < 9000).toBe(true)
    expect(port >= 8080).toBe(true)
    expect(port <= 8080).toBe(true)
  })

  it("should pass strict equality checks", () => {
    const tenantId = TenantId.unsafeOf("tenant-xyz")
    const port = Port.unsafeOf(443)

    // Strict equality with primitives
    expect(tenantId === "tenant-xyz").toBe(true)
    expect(port === 443).toBe(true)

    // Works with switch statements
    let result = ""
    switch (tenantId) {
      case "tenant-xyz":
        result = "matched"
        break
      default:
        result = "not matched"
    }
    expect(result).toBe("matched")
  })

  it("should work with array methods", () => {
    const ids = [TenantId.unsafeOf("tenant-001"), TenantId.unsafeOf("tenant-002"), TenantId.unsafeOf("tenant-003")]

    // Array join
    expect(ids.join(", ")).toBe("tenant-001, tenant-002, tenant-003")

    // Array includes
    expect(ids.includes("tenant-002" as any)).toBe(true)

    // Array map
    const upperIds = ids.map((id) => id.toUpperCase())
    expect(upperIds).toEqual(["TENANT-001", "TENANT-002", "TENANT-003"])
  })

  it("should work with Object.keys and other Object methods", () => {
    const config = {
      tenantId: TenantId.unsafeOf("tenant-config"),
      port: Port.unsafeOf(8443),
      enabled: true,
    }

    // Object.keys should work normally
    expect(Object.keys(config)).toEqual(["tenantId", "port", "enabled"])

    // Object.values should return primitives
    expect(Object.values(config)).toEqual(["tenant-config", 8443, true])

    // Object.entries should work
    expect(Object.entries(config)).toEqual([
      ["tenantId", "tenant-config"],
      ["port", 8443],
      ["enabled", true],
    ])
  })

  it("should validate type behavior", () => {
    const tenantId = TenantId.unsafeOf("tenant-type-test")
    const port = Port.unsafeOf(9090)

    // typeof checks
    expect(typeof tenantId).toBe("string")
    expect(typeof port).toBe("number")

    // instanceof checks - Skip for primitives as they will throw TypeScript errors
    // Primitives cannot be used with instanceof
    // expect(tenantId instanceof String).toBe(false)
    // expect(port instanceof Number).toBe(false)

    // Constructor checks
    expect(tenantId.constructor).toBe(String)
    expect(port.constructor).toBe(Number)
  })

  it("should support destructuring", () => {
    const config = {
      tenantId: TenantId.unsafeOf("tenant-destructure"),
      projectId: ProjectId.unsafeOf("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
      port: Port.unsafeOf(5000),
    }

    // Object destructuring
    const { tenantId, projectId, port } = config
    expect(tenantId).toBe("tenant-destructure")
    expect(projectId).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
    expect(port).toBe(5000)

    // Array destructuring with branded values
    const [first, second] = [TenantId.unsafeOf("tenant-1"), TenantId.unsafeOf("tenant-2")]
    expect(first).toBe("tenant-1")
    expect(second).toBe("tenant-2")
  })
})
