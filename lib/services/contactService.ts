import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  CreateContactInput,
  UpdateContactInput,
  ListContactQuery,
} from "@/lib/schemas/contactSchema";

const SORT_KEY_MAP: Record<
  string,
  keyof Prisma.ContactInquiryOrderByWithRelationInput
> = {
  createdAt: "createdAt",
  name: "name",
  type: "type",
};

function buildContactWhere(
  filters: ListContactQuery
): Prisma.ContactInquiryWhereInput {
  const where: Prisma.ContactInquiryWhereInput = {};

  if (typeof filters.read === "boolean") where.read = filters.read;
  if (filters.type) where.type = filters.type;

  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { subject: { contains: term, mode: "insensitive" } },
      { message: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function createInquiry(input: CreateContactInput) {
  const subject =
    input.subject ?? `New ${input.type} inquiry from ${input.name}`;
  const inquiry = await prisma.contactInquiry.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject,
      message: input.message,
      type: input.type,
      status: "new",
      read: false,
    },
  });
  logger.info("contact.created", {
    inquiryId: inquiry.id,
    type: inquiry.type,
    email: inquiry.email,
  });
  return inquiry;
}

export async function listInquiries(filters: ListContactQuery) {
  const where = buildContactWhere(filters);
  const sortField = SORT_KEY_MAP[filters.sortBy] ?? "createdAt";
  const orderBy: Prisma.ContactInquiryOrderByWithRelationInput = {
    [sortField]: filters.sortOrder,
  };

  const [items, total] = await prisma.$transaction([
    prisma.contactInquiry.findMany({
      where,
      take: filters.limit,
      skip: filters.offset,
      orderBy,
    }),
    prisma.contactInquiry.count({ where }),
  ]);

  return { items, total };
}

export async function getInquiryById(id: string) {
  const inquiry = await prisma.contactInquiry.findUnique({ where: { id } });
  if (!inquiry) throw new NotFoundError("Inquiry not found");
  return inquiry;
}

export async function updateInquiry(id: string, data: UpdateContactInput) {
  return prisma.$transaction(async (tx) => {
    const exists = await tx.contactInquiry.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("Inquiry not found");

    let newRead: boolean | undefined;
    let newStatus: string | undefined;

    if (typeof data.read === "boolean") {
      newRead = data.read;
      newStatus = data.read ? "read" : "new";
    }

    if (data.status) {
      newStatus = data.status;
      newRead = data.status !== "new";
    }

    const updated = await tx.contactInquiry.update({
      where: { id },
      data: {
        ...(newStatus !== undefined ? { status: newStatus } : {}),
        ...(newRead !== undefined ? { read: newRead } : {}),
      },
    });

    logger.info("contact.updated", {
      inquiryId: id,
      status: updated.status,
      read: updated.read,
    });

    return updated;
  });
}

export async function deleteInquiry(id: string) {
  const exists = await prisma.contactInquiry.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) throw new NotFoundError("Inquiry not found");
  const deleted = await prisma.contactInquiry.delete({ where: { id } });
  logger.info("contact.deleted", { inquiryId: id });
  return deleted;
}
