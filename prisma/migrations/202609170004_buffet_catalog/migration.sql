-- Preserve products referenced by previous sales, but remove old meals from sale.
UPDATE `Product` SET `active` = false WHERE `category` <> 'Bebidas' AND `saleType` = 'UNIT';

-- Price must be configured by the administrator before these products can be sold.
INSERT INTO `Product` (`id`, `name`, `category`, `priceCents`, `saleType`, `active`, `createdAt`)
VALUES
(UUID(), 'Buffet regular', 'Buffet', 0, 'WEIGHT', false, NOW()),
(UUID(), 'Buffet especial carnes', 'Buffet', 0, 'WEIGHT', false, NOW());
