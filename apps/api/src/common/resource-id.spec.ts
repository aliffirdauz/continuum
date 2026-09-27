import { BadRequestException } from "@nestjs/common";

import { ResourceIdPipe } from "./resource-id";

describe("ResourceIdPipe", () => {
  const pipe = new ResourceIdPipe();

  it.each(["ka_line4_troubleshooting", "emp_budi", "clx9z0a1b0000abcd"])(
    "accepts %s",
    (id) => {
      expect(pipe.transform(id)).toBe(id);
    },
  );

  it.each(["", "ka line4", "../etc/passwd", "ka_%27", "x".repeat(65)])(
    "rejects %j",
    (id) => {
      expect(() => pipe.transform(id)).toThrow(BadRequestException);
    },
  );
});
