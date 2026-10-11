from blog.extensions import db
from blog.models import Post


def test_homepage_shows_empty_state(client):
    response = client.get("/")

    assert response.status_code == 200
    assert b"Your first story starts here." in response.data


def test_create_post(client, app):
    response = client.post(
        "/posts/new",
        data={"title": "A first note", "content": "A little beginning."},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"A first note" in response.data
    assert b"A little beginning." in response.data
    with app.app_context():
        post = db.session.execute(db.select(Post)).scalar_one()
        assert post.title == "A first note"


def test_create_post_requires_title_and_content(client):
    response = client.post("/posts/new", data={"title": " ", "content": ""})

    assert response.status_code == 422
    assert b"Please enter a title." in response.data
    assert b"Please write some content." in response.data


def test_post_can_be_viewed_and_edited(client, app):
    with app.app_context():
        post = Post(title="Before edit", content="Original text")
        db.session.add(post)
        db.session.commit()
        post_id = post.id

    detail = client.get(f"/posts/{post_id}")
    assert detail.status_code == 200
    assert b"Original text" in detail.data

    response = client.post(
        f"/posts/{post_id}/edit",
        data={"title": "After edit", "content": "Updated text"},
        follow_redirects=True,
    )
    assert response.status_code == 200
    assert b"After edit" in response.data
    assert b"Updated text" in response.data


def test_post_can_be_deleted(client, app):
    with app.app_context():
        post = Post(title="Temporary", content="This will be removed.")
        db.session.add(post)
        db.session.commit()
        post_id = post.id

    response = client.post(
        f"/posts/{post_id}/delete",
        data={"submit": "Delete post"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"The post has been deleted." in response.data
    assert b"Your first story starts here." in response.data
    with app.app_context():
        assert db.session.get(Post, post_id) is None


def test_missing_post_returns_friendly_not_found_page(client):
    response = client.get("/posts/999")

    assert response.status_code == 404
    assert b"This page wandered off" in response.data
