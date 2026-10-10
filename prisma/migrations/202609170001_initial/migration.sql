-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `username` VARCHAR(60) NOT NULL,
    `passwordHash` VARCHAR(100) NOT NULL,
    `role` ENUM('ADMIN', 'ATTENDANT', 'CASHIER') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `terminal` VARCHAR(80) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `category` VARCHAR(60) NOT NULL,
    `priceCents` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tab` (
    `id` CHAR(36) NOT NULL,
    `number` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(80) NOT NULL,
    `status` ENUM('OPEN', 'PAID', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `version` INTEGER NOT NULL DEFAULT 0,
    `openedBy` CHAR(36) NOT NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Tab_number_key`(`number`),
    INDEX `Tab_status_openedAt_idx`(`status`, `openedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TabItem` (
    `id` CHAR(36) NOT NULL,
    `tabId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `productName` VARCHAR(100) NOT NULL,
    `unitPriceCents` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `note` VARCHAR(240) NOT NULL DEFAULT '',
    `addedBy` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TabItem_tabId_idx`(`tabId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` CHAR(36) NOT NULL,
    `tabId` CHAR(36) NOT NULL,
    `method` ENUM('PIX', 'CARD') NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `recordedBy` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `xml` LONGTEXT NOT NULL,

    UNIQUE INDEX `Payment_tabId_key`(`tabId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `userName` VARCHAR(100) NOT NULL,
    `terminal` VARCHAR(80) NOT NULL,
    `action` VARCHAR(60) NOT NULL,
    `entityId` VARCHAR(100) NOT NULL,
    `details` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommandReceipt` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `result` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TabItem` ADD CONSTRAINT `TabItem_tabId_fkey` FOREIGN KEY (`tabId`) REFERENCES `Tab`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TabItem` ADD CONSTRAINT `TabItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_tabId_fkey` FOREIGN KEY (`tabId`) REFERENCES `Tab`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
