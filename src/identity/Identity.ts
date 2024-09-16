export type Identity<T> = {
  id: T
  isSame?: (other: Identity<T>) => boolean
}

function Identity<T>(value: T): Identity<T> {
  const isSame = (other: Identity<T>): boolean => {
    return other.id === value
  }
  return {
    id: value,
    isSame,
  }
}
