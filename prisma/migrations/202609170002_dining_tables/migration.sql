-- AlterTable
ALTER TABLE `Tab` ADD COLUMN `tableNumber` INTEGER NULL;

-- CreateTable
CREATE TABLE `DiningTable` (
    `number` INTEGER NOT NULL,
    `activeTabId` CHAR(36) NULL,

    UNIQUE INDEX `DiningTable_activeTabId_key`(`activeTabId`),
    PRIMARY KEY (`number`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Tab` ADD CONSTRAINT `Tab_tableNumber_fkey` FOREIGN KEY (`tableNumber`) REFERENCES `DiningTable`(`number`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiningTable` ADD CONSTRAINT `DiningTable_activeTabId_fkey` FOREIGN KEY (`activeTabId`) REFERENCES `Tab`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Fixed dining room: keep all existing tabs and add 30 initially free tables.
INSERT INTO `DiningTable` (`number`) VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),
(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),
(21),(22),(23),(24),(25),(26),(27),(28),(29),(30);
