//! 测试数据库版本保持在v1

use crate::database::{Database, SCHEMA_VERSION};
use crate::error::AppError;

#[test]
fn test_database_version_stays_v1() -> Result<(), AppError> {
    // 创建内存数据库
    let db = Database::memory()?;

    // 应用schema迁移
    let conn = db.conn.lock().unwrap();
    Database::apply_schema_migrations_on_conn(&*conn)?;

    // 获取数据库版本
    let version = Database::get_user_version(&*conn)?;

    // 验证版本保持在1
    assert_eq!(version, SCHEMA_VERSION);
    assert_eq!(version, 1);

    // 验证数据库表存在
    assert!(Database::table_exists(&*conn, "providers")?);

    // 验证v2/v3字段不存在（保持v1）
    assert!(!Database::has_column(&*conn, "providers", "is_duplicated")?);
    assert!(!Database::has_column(&*conn, "providers", "is_edited_after_duplication")?);
    assert!(!Database::has_column(&*conn, "providers", "is_pinned")?);

    println!("✅ 数据库版本成功保持在 v1");

    Ok(())
}