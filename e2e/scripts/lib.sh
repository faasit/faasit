

function get_container_id() {
  name="$1"
  id=$(docker container ls | grep ${name} | awk '{print $1}')
  echo $id
}

"$@"