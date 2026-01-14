# Validation Patterns

Common validation patterns for Optimizely CMS properties.

## String Validation

```typescript
{
  type: 'string',
  minLength: 5,
  maxLength: 100,
  pattern: '^[A-Za-z0-9 ]+$',  // Alphanumeric and spaces
}
```

## Number Validation

```typescript
{
  type: 'integer',
  minimum: 1,
  maximum: 100,
}
```

## DateTime Validation

```typescript
{
  type: 'dateTime',
  minimum: '2025-01-01T00:00:00Z',  // ISO 8601
  maximum: '2025-12-31T23:59:59Z',
}
```

## Array Validation

```typescript
{
  type: 'array',
  items: { type: 'string', maxLength: 50 },
  minItems: 1,
  maxItems: 10,
}
```

## Common Regex Patterns

### Email
```typescript
pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
```

### URL Slug (kebab-case)
```typescript
pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
```

### Hex Color
```typescript
pattern: '^#[0-9A-Fa-f]{6}$'
```

### Phone (US)
```typescript
pattern: '^\\+?1?\\s*\\(?([0-9]{3})\\)?[-\\s.]?([0-9]{3})[-\\s.]?([0-9]{4})$'
```

### Alphanumeric Only
```typescript
pattern: '^[A-Za-z0-9]+$'
```
