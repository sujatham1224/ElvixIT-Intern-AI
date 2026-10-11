from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from sqlalchemy import text

from .extensions import db
from .forms import DeleteForm, PostForm
from .models import Post

bp = Blueprint("blog", __name__)


@bp.get("/")
def index():
    posts = db.session.execute(
        db.select(Post).order_by(Post.created_at.desc(), Post.id.desc())
    ).scalars().all()
    return render_template("index.html", posts=posts)


@bp.get("/healthz")
def health_check():
    db.session.execute(text("SELECT 1"))
    return {"status": "ok"}, 200


@bp.route("/posts/new", methods=["GET", "POST"])
def create_post():
    form = PostForm()
    if form.validate_on_submit():
        post = Post(title=form.title.data.strip(), content=form.content.data.strip())
        if not post.title or not post.content:
            flash("Title and content cannot be blank.", "error")
            return render_template("post_form.html", form=form, heading="Write a post"), 422
        db.session.add(post)
        db.session.commit()
        flash("Your post has been published.", "success")
        return redirect(url_for("blog.show_post", post_id=post.id))
    return render_template("post_form.html", form=form, heading="Write a post"), (
        422 if request.method == "POST" else 200
    )


@bp.get("/posts/<int:post_id>")
def show_post(post_id):
    post = db.get_or_404(Post, post_id)
    return render_template("post_detail.html", post=post, delete_form=DeleteForm())


@bp.route("/posts/<int:post_id>/edit", methods=["GET", "POST"])
def edit_post(post_id):
    post = db.get_or_404(Post, post_id)
    form = PostForm(obj=post)
    if form.validate_on_submit():
        title = form.title.data.strip()
        content = form.content.data.strip()
        if not title or not content:
            flash("Title and content cannot be blank.", "error")
            return render_template(
                "post_form.html", form=form, heading="Edit post", post=post
            ), 422
        post.title = title
        post.content = content
        db.session.commit()
        flash("Your changes have been saved.", "success")
        return redirect(url_for("blog.show_post", post_id=post.id))
    return render_template("post_form.html", form=form, heading="Edit post", post=post), (
        422 if request.method == "POST" else 200
    )


@bp.post("/posts/<int:post_id>/delete")
def delete_post(post_id):
    post = db.get_or_404(Post, post_id)
    form = DeleteForm()
    if not form.validate_on_submit():
        abort(400)
    db.session.delete(post)
    db.session.commit()
    flash("The post has been deleted.", "success")
    return redirect(url_for("blog.index"))
